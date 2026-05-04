import mongoose from "mongoose";
import { syncProviderApprovalFields } from "../utils/providerApproval.js";

const pricingSchema = new mongoose.Schema(
  {
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service"
    },
    label: String,
    unit: {
      type: String,
      default: "visit"
    },
    basePrice: Number,
    maxPrice: Number,
    offerNote: String
  },
  { _id: false }
);

const serviceAreaSchema = new mongoose.Schema(
  {
    city: String,
    area: String,
    radiusKm: {
      type: Number,
      default: 8
    }
  },
  { _id: false }
);

const providerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    headline: {
      type: String,
      default: "Trusted local technician"
    },
    bio: String,
    experienceYears: {
      type: Number,
      default: 1
    },
    serviceCategories: [String],
    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service"
      }
    ],
    pricingCatalog: [pricingSchema],
    serviceAreas: [serviceAreaSchema],
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number],
        default: [80.2707, 13.0827]
      }
    },
    addressText: String,
    city: String,
    area: String,
    whatsappNumber: String,
    alternatePhone: String,
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    rejectionReason: {
      type: String,
      default: ""
    },
    isEditable: {
      type: Boolean,
      default: true
    },
    approved: {
      type: Boolean,
      default: false
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    approvedAt: Date,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    rejectedAt: Date,
    availableNow: {
      type: Boolean,
      default: true
    },
    responseTimeMinutes: {
      type: Number,
      default: 15
    },
    ratingAvg: {
      type: Number,
      default: 4.8
    },
    reviewCount: {
      type: Number,
      default: 0
    },
    jobsCompleted: {
      type: Number,
      default: 0
    },
    coverImage: String,
    gallery: [String],
    badges: [String],
    languages: {
      type: [String],
      default: ["English", "Tamil"]
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    avatar: String,
    startingPrice: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

providerSchema.pre("validate", function syncApprovalState(next) {
  syncProviderApprovalFields(this);
  next();
});

providerSchema.index({ location: "2dsphere" });

const Provider = mongoose.model("Provider", providerSchema);

export default Provider;
