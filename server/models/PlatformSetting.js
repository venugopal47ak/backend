import mongoose from "mongoose";
import { serviceableCities } from "../utils/providerProfile.js";

const platformSettingSchema = new mongoose.Schema(
  {
    singleton: {
      type: String,
      default: "default",
      unique: true
    },
    supportPhone: String,
    supportEmail: String,
    platformFeePercent: {
      type: Number,
      default: 8
    },
    darkModeDefault: {
      type: Boolean,
      default: false
    },
    serviceableCities: {
      type: [String],
      default: serviceableCities
    },
    featureFlags: {
      whatsappBookingEnabled: {
        type: Boolean,
        default: true
      },
      cashOnServiceEnabled: {
        type: Boolean,
        default: true
      },
      heroOffersEnabled: {
        type: Boolean,
        default: true
      }
    }
  },
  { timestamps: true }
);

const PlatformSetting = mongoose.model("PlatformSetting", platformSettingSchema);

export default PlatformSetting;
