import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    titleTa: {
      type: String,
      default: ""
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    category: {
      type: String,
      required: true
    },
    description: String,
    image: String,
    icon: String,
    basePrice: {
      type: Number,
      required: true
    },
    turnaroundMinutes: {
      type: Number,
      default: 90
    },
    featured: {
      type: Boolean,
      default: false
    },
    active: {
      type: Boolean,
      default: true
    },
    tags: [String]
  },
  { timestamps: true }
);

const Service = mongoose.model("Service", serviceSchema);

export default Service;

