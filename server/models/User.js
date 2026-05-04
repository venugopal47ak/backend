import mongoose from "mongoose";
import bcrypt from "bcryptjs";

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

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    phone: {
      type: String,
      required: true
    },
    avatar: String,
    coverImage: String,
    role: {
      type: String,
      enum: ["USER", "PROVIDER", "ADMIN", "SUPER_ADMIN"],
      default: "USER"
    },
    preferredLanguage: {
      type: String,
      enum: ["EN", "TA"],
      default: "EN"
    },
    city: String,
    area: String,
    address: addressSchema,
    isActive: {
      type: Boolean,
      default: true
    },
    providerProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider"
    },
    strikes: {
      type: Number,
      default: 0
    },
    warnings: {
      type: Number,
      default: 0
    },
    hasUnreadAction: {
      type: Boolean,
      default: false
    }


  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function matchPassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;

