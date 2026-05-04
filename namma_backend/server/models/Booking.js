import mongoose from "mongoose";
import { syncBookingStatusFields } from "../utils/bookingStatus.js";

const timelineSchema = new mongoose.Schema(
  {
    status: String,
    note: String,
    changedByRole: String,
    at: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    line1: String,
    landmark: String,
    city: String,
    area: String,
    pincode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: {
      type: String,
      unique: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      required: true
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true
    },
    address: addressSchema,
    scheduledAt: {
      type: Date,
      required: true
    },
    preferredSlot: String,
    notes: String,
    paymentMethod: {
      type: String,
      enum: ["RAZORPAY", "CASH"],
      default: "CASH"
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "REFUNDED", "COD_PENDING"],
      default: "COD_PENDING"
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "completed", "rejected"],
      default: "pending"
    },
    bookingStatus: {
      type: String,
      enum: [
        "REQUESTED",
        "ACCEPTED",
        "REJECTED",
        "ON_THE_WAY",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED"
      ],
      default: "REQUESTED"
    },
    pricing: {
      baseAmount: Number,
      visitFee: Number,
      partsEstimate: Number,
      discount: Number,
      totalAmount: Number
    },
    timeline: [timelineSchema],
    providerNotes: String,
    sharedViaWhatsApp: {
      type: Boolean,
      default: false
    },
    razorpay: {
      orderId: String,
      paymentId: String,
      signature: String
    },
    complaint: {
      isRaised: { type: Boolean, default: false },
      reason: String,
      raisedAt: Date,
      status: { type: String, enum: ["OPEN", "RESOLVED"], default: "OPEN" },
      adminAction: { type: String, enum: ["STRIKE", "WARNING", "RESOLVED_WITHOUT_ACTION"] },
      adminNote: String
    }

  },

  { timestamps: true }
);

bookingSchema.pre("validate", function setBookingCode(next) {
  if (!this.bookingCode) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    this.bookingCode = `NS-${Date.now().toString().slice(-6)}-${suffix}`;
  }

  next();
});

bookingSchema.pre("validate", function syncStatus(next) {
  syncBookingStatusFields(this);
  next();
});

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
