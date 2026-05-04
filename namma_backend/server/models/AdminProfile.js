import mongoose from "mongoose";

const adminProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    scope: {
      type: String,
      enum: ["LOCAL", "REGIONAL", "PLATFORM"],
      default: "LOCAL"
    },
    permissions: {
      type: [String],
      default: []
    },
    notes: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    lastLoginAt: Date
  },
  { timestamps: true }
);

const AdminProfile = mongoose.model("AdminProfile", adminProfileSchema);

export default AdminProfile;

