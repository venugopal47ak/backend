import crypto from "crypto";
import Razorpay from "razorpay";
import Booking from "../models/Booking.js";
import asyncHandler from "../utils/asyncHandler.js";

const getRazorpayClient = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
};

export const createOrder = asyncHandler(async (req, res) => {
  const razorpay = getRazorpayClient();
  const booking = await Booking.findById(req.params.bookingId);

  if (!booking) {
    res.status(404);
    throw new Error("Booking not found");
  }

  if (String(booking.user) !== String(req.user._id)) {
    res.status(403);
    throw new Error("You cannot pay for this booking");
  }

  if (!razorpay) {
    res.status(503);
    throw new Error("Razorpay keys are missing in server environment");
  }

  const order = await razorpay.orders.create({
    amount: Math.round((booking.pricing.totalAmount || 0) * 100),
    currency: "INR",
    receipt: booking.bookingCode,
    notes: {
      bookingId: String(booking._id)
    }
  });

  booking.razorpay.orderId = order.id;
  await booking.save();

  res.json({
    order,
    key: process.env.RAZORPAY_KEY_ID
  });
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    res.status(404);
    throw new Error("Booking not found");
  }

  if (String(booking.user) !== String(req.user._id)) {
    res.status(403);
    throw new Error("You cannot verify payment for this booking");
  }

  if (!process.env.RAZORPAY_KEY_SECRET) {
    res.status(503);
    throw new Error("Razorpay secret is missing in server environment");
  }

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    res.status(400);
    throw new Error("Payment signature verification failed");
  }

  booking.paymentStatus = "PAID";
  booking.razorpay = {
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature
  };
  booking.timeline.push({
    status: booking.bookingStatus,
    note: "Razorpay payment verified",
    changedByRole: "SYSTEM"
  });

  await booking.save();

  res.json({ success: true, booking });
});
