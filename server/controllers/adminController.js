import AdminProfile from "../models/AdminProfile.js";
import Booking from "../models/Booking.js";
import PlatformSetting from "../models/PlatformSetting.js";
import Review from "../models/Review.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import Provider from "../models/Provider.js";

const ensureSettings = async () => {
  let settings = await PlatformSetting.findOne({ singleton: "default" });

  if (!settings) {
    settings = await PlatformSetting.create({
      singleton: "default",
      supportPhone: "+91 90000 90000",
      supportEmail: "support@nammaserve.in"
    });
  }

  return settings;
};

export const getDashboardStats = asyncHandler(async (req, res) => {
  const [users, providers, bookings, services, reviews, complaints, recentBookings, paidBookings] =
    await Promise.all([
      User.countDocuments(),
      Provider.countDocuments(),
      Booking.countDocuments(),
      Service.countDocuments(),
      Review.countDocuments(),
      Booking.countDocuments({ "complaint.isRaised": true }),
      Booking.find()
        .populate("service", "title")
        .populate("user", "name")
        .sort({ createdAt: -1 })
        .limit(6),
      Booking.find({ paymentStatus: "PAID" }).select("pricing.totalAmount")
    ]);

  const revenue = paidBookings.reduce(
    (sum, item) => sum + (item.pricing?.totalAmount || 0),
    0
  );

  res.json({
    metrics: {
      users,
      providers,
      bookings,
      services,
      reviews,
      complaints,
      revenue
    },


    recentBookings
  });
});

export const getUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;
  const users = await User.find(role ? { role } : {})
    .select("-password")
    .sort({ createdAt: -1 });

  res.json({ users });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { isActive, role } = req.body;
  const user = await User.findById(req.params.userId);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.email === "mecchi216@gmail.com") {
    res.status(403);
    throw new Error("The Founder Console account cannot be deactivated or modified.");
  }


  if (typeof isActive === "boolean") {
    user.isActive = isActive;
  }

  if (role && req.user.role === "SUPER_ADMIN") {
    user.role = role;
  }

  await user.save();
  res.json({ user: { ...user.toObject(), password: undefined } });
});

export const getBookingsAdmin = asyncHandler(async (req, res) => {
  const bookings = await Booking.find()
    .populate("service", "title")
    .populate("user", "name")
    .populate({
      path: "provider",
      populate: {
        path: "user",
        select: "name"
      }
    })
    .sort({ createdAt: -1 });

  res.json({ bookings });
});

export const createAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role = "ADMIN", scope = "LOCAL" } = req.body;

  if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
    res.status(400);
    throw new Error("Role must be ADMIN or SUPER_ADMIN");
  }

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    res.status(409);
    throw new Error("Email is already in use");
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role
  });

  const adminProfile = await AdminProfile.create({
    user: user._id,
    scope,
    permissions:
      role === "SUPER_ADMIN"
        ? ["all"]
        : ["users:view", "providers:approve", "bookings:manage", "complaints:manage"],
    createdBy: req.user._id
  });

  res.status(201).json({
    user: { ...user.toObject(), password: undefined },
    adminProfile
  });
});

export const getComplaints = asyncHandler(async (req, res) => {
  const complaints = await Booking.find({ "complaint.isRaised": true })
    .populate("user", "name email phone strikes warnings isActive")
    .populate({
      path: "provider",
      populate: { path: "user", select: "name" }
    })
    .populate("service", "title")
    .sort({ "complaint.raisedAt": -1 });

  res.json({ complaints });
});

export const issueActionToUser = asyncHandler(async (req, res) => {
  const { userId, type, bookingId, note } = req.body;
  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (type === "STRIKE") {
    user.strikes += 1;
    user.hasUnreadAction = true;
    if (user.strikes >= 3) {
      user.isActive = false;
    }
  } else if (type === "WARNING") {
    user.warnings += 1;
    user.hasUnreadAction = true;
  } else {

    res.status(400);
    throw new Error("Invalid action type. Must be STRIKE or WARNING");
  }

  await user.save();

  // Optionally mark the complaint as resolved if a bookingId is provided
  if (bookingId) {
    const booking = await Booking.findById(bookingId);
    if (booking) {
      booking.complaint.status = "RESOLVED";
      booking.complaint.adminAction = type;
      booking.complaint.adminNote = note;
      booking.timeline.push({
        status: booking.bookingStatus,
        note: `Admin action taken (${type}): ${note || "Disciplinary action issued"}`,
        changedByRole: req.user.role
      });
      await booking.save();
    }

  }

  res.json({ 
    success: true, 
    message: `${type} issued successfully`,
    user: { strikes: user.strikes, warnings: user.warnings, isActive: user.isActive }
  });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.email === "mecchi216@gmail.com") {
    res.status(403);
    throw new Error("The Founder Console account is protected and cannot be removed.");
  }


  if (user.isActive) {
    res.status(400);
    throw new Error("Account must be deactivated before permanent removal");
  }

  if (user._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error("You cannot delete your own account");
  }

  if (user.role === "PROVIDER") {
    await Provider.findOneAndDelete({ user: user._id });
  }

  await User.findByIdAndDelete(user._id);

  res.json({ success: true, message: "User account permanently removed" });
});

export const getPlatformSettings = asyncHandler(async (req, res) => {


  const settings = await ensureSettings();
  res.json({ settings });
});

export const updatePlatformSettings = asyncHandler(async (req, res) => {
  const settings = await ensureSettings();
  Object.assign(settings, req.body);
  await settings.save();
  res.json({ settings });
});
