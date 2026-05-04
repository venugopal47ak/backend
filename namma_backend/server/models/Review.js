import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
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
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    title: String,
    comment: String,
    sentiment: {
      type: String,
      enum: ["positive", "negative", "neutral"],
      default: "neutral"
    },
    verifiedByProvider: {
      type: Boolean,
      default: false
    }
  },

  { timestamps: true }
);

const Review = mongoose.model("Review", reviewSchema);

export default Review;

