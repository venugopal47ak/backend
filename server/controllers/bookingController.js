import Booking from "../models/Booking.js";
import Provider from "../models/Provider.js";
import Service from "../models/Service.js";
import Review from "../models/Review.js";
import asyncHandler from "../utils/asyncHandler.js";
import { buildWhatsAppLink } from "../utils/geo.js";
import { isProviderApproved } from "../utils/providerApproval.js";
import {
  getNormalizedBookingStatus,
  syncBookingStatusFields,
  toBookingLifecycleStatus
} from "../utils/bookingStatus.js";

const resolvePrice = (provider, serviceId, serviceBasePrice) => {
  const catalogItem = provider.pricingCatalog.find(
    (item) => String(item.service) === String(serviceId)
  );
  const baseAmount = catalogItem?.basePrice || serviceBasePrice;
  return {
    baseAmount,
    visitFee: 99,
    partsEstimate: 0,
    discount: 0,
    totalAmount: baseAmount + 99
  };
};

const bookingActionPopulate = {
  path: "provider",
  select: "user"
};

const canManageProviderBooking = (booking, user) =>
  user.role === "ADMIN" ||
  user.role === "SUPER_ADMIN" ||
  String(booking.provider.user) === String(user._id);

const saveBookingTransition = async ({
  booking,
  lifecycleStatus,
  note,
  actorRole
}) => {
  booking.bookingStatus = lifecycleStatus;
  syncBookingStatusFields(booking);

  if (booking.bookingStatus === "COMPLETED" && booking.paymentMethod === "CASH") {
    booking.paymentStatus = "PAID";
  }

  booking.timeline.push({
    status: booking.bookingStatus,
    note,
    changedByRole: actorRole
  });

  await booking.save();
  return booking;
};

const loadManagedBooking = async (bookingId, user) => {
  const booking = await Booking.findById(bookingId).populate(bookingActionPopulate);

  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  if (!canManageProviderBooking(booking, user)) {
    const error = new Error("You cannot update this booking");
    error.statusCode = 403;
    throw error;
  }

  return booking;
};

const providerLifecycleTransitions = {
  REQUESTED: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["ON_THE_WAY", "IN_PROGRESS", "COMPLETED"],
  ON_THE_WAY: ["IN_PROGRESS", "COMPLETED"],
  IN_PROGRESS: ["COMPLETED"]
};

const getDefaultTransitionNote = (lifecycleStatus) => {
  switch (lifecycleStatus) {
    case "ACCEPTED":
      return "Booking accepted by provider";
    case "COMPLETED":
      return "Booking marked as completed by provider";
    case "REJECTED":
      return "Booking rejected by provider";
    default:
      return `Booking updated to ${lifecycleStatus}`;
  }
};

export const createBooking = asyncHandler(async (req, res) => {
  const {
    providerId,
    serviceId,
    scheduledAt,
    preferredSlot,
    notes,
    address,
    paymentMethod = "CASH"
  } = req.body;

  const [provider, service] = await Promise.all([
    Provider.findById(providerId).populate("user", "name phone"),
    Service.findById(serviceId)
  ]);

  if (!provider || !isProviderApproved(provider)) {
    res.status(404);
    throw new Error("Provider is unavailable");
  }

  if (!service) {
    res.status(404);
    throw new Error("Service not found");
  }

  const pricing = resolvePrice(provider, service._id, service.basePrice);
  const booking = await Booking.create({
    user: req.user._id,
    provider: provider._id,
    service: service._id,
    scheduledAt,
    preferredSlot,
    notes,
    address,
    status: "pending",
    paymentMethod,
    paymentStatus: paymentMethod === "RAZORPAY" ? "PENDING" : "COD_PENDING",
    pricing,
    timeline: [
      {
        status: "REQUESTED",
        note: "Booking request placed",
        changedByRole: "USER"
      }
    ]
  });

  res.status(201).json({
    booking,
    whatsappLink: buildWhatsAppLink({
      phone: provider.whatsappNumber || provider.user?.phone,
      message: `Hi ${provider.user?.name}, I just created booking ${booking.bookingCode} on NammaServe for ${service.title}.`
    })
  });
});

export const getMyBookings = asyncHandler(async (req, res) => {
  const query =
    req.user.role === "USER"
      ? { user: req.user._id }
      : req.user.role === "PROVIDER"
        ? { provider: req.user.providerProfile }
        : {};

  const bookings = await Booking.find(query)
    .populate("service", "title titleTa image")
    .populate({
      path: "provider",
      populate: {
        path: "user",
        select: "name phone"
      }
    })
    .populate("user", "name phone strikes warnings")

    .sort({ createdAt: -1 });

  // Add reviewed flag if user is a customer
  let bookingsWithReviewState = bookings;
  if (req.user.role === "USER") {
    const reviews = await Review.find({ user: req.user._id });
    const reviewedBookingIds = new Set(reviews.map(r => String(r.booking)));
    
    bookingsWithReviewState = bookings.map(booking => ({
      ...booking.toObject(),
      isReviewed: reviewedBookingIds.has(String(booking._id))
    }));
  }

  res.json({ bookings: bookingsWithReviewState });
});

export const getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("service")
    .populate({
      path: "provider",
      populate: {
        path: "user",
        select: "name phone"
      }
    })
    .populate("user", "name phone email");

  if (!booking) {
    res.status(404);
    throw new Error("Booking not found");
  }

  const isAllowed =
    req.user.role === "ADMIN" ||
    req.user.role === "SUPER_ADMIN" ||
    String(booking.user._id) === String(req.user._id) ||
    String(booking.provider.user?._id) === String(req.user._id);

  if (!isAllowed) {
    res.status(403);
    throw new Error("You cannot view this booking");
  }

  res.json({ booking });
});

export const updateBookingStatus = asyncHandler(async (req, res) => {
  const lifecycleStatus = toBookingLifecycleStatus(req.body.status);
  const booking = await loadManagedBooking(req.params.id, req.user);

  if (!lifecycleStatus) {
    res.status(400);
    throw new Error("Invalid booking status");
  }

  const isProvider = String(booking.provider.user) === String(req.user._id);

  if (isProvider) {
    const allowedTransitions =
      providerLifecycleTransitions[booking.bookingStatus] || [];

    if (!allowedTransitions.includes(lifecycleStatus)) {
      res.status(400);
      throw new Error(
        `Invalid status transition from ${booking.bookingStatus} to ${lifecycleStatus}`
      );
    }
  }

  await saveBookingTransition({
    booking,
    lifecycleStatus,
    note: req.body.note || getDefaultTransitionNote(lifecycleStatus),
    actorRole: req.user.role
  });

  res.json({ booking });
});

export const updateBooking = asyncHandler(async (req, res) => {
  const { scheduledAt, notes } = req.body;
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error("Booking not found");
  }

  if (String(booking.user) !== String(req.user._id)) {
    res.status(403);
    throw new Error("You can only edit your own bookings");
  }

  if (booking.bookingStatus !== "REQUESTED") {
    res.status(400);
    throw new Error("Only requested bookings can be edited");
  }

  if (scheduledAt) booking.scheduledAt = scheduledAt;
  if (notes) booking.notes = notes;

  booking.timeline.push({
    status: booking.bookingStatus,
    note: "Booking details updated by user",
    changedByRole: "USER"
  });

  await booking.save();
  res.json({ booking });
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error("Booking not found");
  }

  if (String(booking.user) !== String(req.user._id) && req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
    res.status(403);
    throw new Error("You cannot cancel this booking");
  }

  if (["COMPLETED", "CANCELLED"].includes(booking.bookingStatus)) {
    res.status(400);
    throw new Error(`Cannot cancel a booking that is ${booking.bookingStatus}`);
  }

  booking.bookingStatus = "CANCELLED";
  booking.status = "rejected";
  booking.timeline.push({
    status: "CANCELLED",
    note: "Booking cancelled by user",
    changedByRole: req.user.role
  });

  await booking.save();
  res.json({ booking });
});

export const acceptBooking = asyncHandler(async (req, res) => {
  const booking = await loadManagedBooking(req.params.id, req.user);

  if (getNormalizedBookingStatus(booking) !== "pending") {
    res.status(400);
    throw new Error("Only pending bookings can be accepted");
  }

  await saveBookingTransition({
    booking,
    lifecycleStatus: "ACCEPTED",
    note: req.body.note || "Booking accepted by provider",
    actorRole: req.user.role
  });

  res.json({ booking });
});

export const completeBooking = asyncHandler(async (req, res) => {
  const booking = await loadManagedBooking(req.params.id, req.user);
  const normalizedStatus = getNormalizedBookingStatus(booking);

  if (normalizedStatus !== "accepted") {
    res.status(400);
    throw new Error("Only accepted bookings can be completed");
  }

  await saveBookingTransition({
    booking,
    lifecycleStatus: "COMPLETED",
    note: req.body.note || "Booking marked as completed by provider",
    actorRole: req.user.role
  });

  res.json({ booking });
});

export const rejectBooking = asyncHandler(async (req, res) => {
  const booking = await loadManagedBooking(req.params.id, req.user);

  if (getNormalizedBookingStatus(booking) !== "pending") {
    res.status(400);
    throw new Error("Only pending bookings can be rejected");
  }

  await saveBookingTransition({
    booking,
    lifecycleStatus: "REJECTED",
    note: req.body.note || "Booking rejected by provider",
    actorRole: req.user.role
  });

  res.json({ booking });
});

export const raiseComplaint = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const booking = await loadManagedBooking(req.params.id, req.user);

  if (!reason) {
    res.status(400);
    throw new Error("Complaint reason is required");
  }

  booking.complaint = {
    isRaised: true,
    reason,
    raisedAt: new Date(),
    status: "OPEN"
  };

  booking.timeline.push({
    status: booking.bookingStatus,
    note: `Complaint raised by provider: ${reason}`,
    changedByRole: "PROVIDER"
  });

  await booking.save();
  res.json({ success: true, booking });
});

export const resolveComplaint = asyncHandler(async (req, res) => {
  const booking = await loadManagedBooking(req.params.id, req.user);

  if (!booking.complaint?.isRaised) {
    res.status(400);
    throw new Error("No active complaint found for this booking");
  }

  booking.complaint.status = "RESOLVED";
  
  booking.timeline.push({
    status: booking.bookingStatus,
    note: "Complaint marked as resolved",
    changedByRole: "PROVIDER"
  });

  await booking.save();
  res.json({ success: true, booking });
});
export const getActionHistory = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({
    user: req.user._id,
    "complaint.isRaised": true
  })
    .populate("service", "title")
    .populate({
      path: "provider",
      populate: { path: "user", select: "name" }
    })
    .sort({ "complaint.raisedAt": -1 });

  res.json({ history: bookings });
});

export const acknowledgeAction = asyncHandler(async (req, res) => {
  req.user.hasUnreadAction = false;
  await req.user.save();
  res.json({ success: true });
});

