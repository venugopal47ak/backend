import Booking from "../models/Booking.js";
import Provider from "../models/Provider.js";
import Review from "../models/Review.js";
import asyncHandler from "../utils/asyncHandler.js";

// Simple sentiment analysis based on rating fallback
const analyzeSentiment = (comment, rating) => {
  if (!comment) {
    // Fallback: Use rating if no comment
    if (rating >= 4) return "positive";
    if (rating <= 2) return "negative";
    return "neutral";
  }

  // Basic keyword-based sentiment for comments
  const positive = /good|great|excellent|amazing|perfect|love|awesome|fantastic|wonderful/i;
  const negative = /bad|poor|terrible|horrible|awful|hate|waste|disappointing|useless/i;

  if (negative.test(comment)) return "negative";
  if (positive.test(comment)) return "positive";
  return "neutral";
};

export const addReview = asyncHandler(async (req, res) => {
  const { booking: bookingId, rating, title, comment } = req.body;
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    res.status(404);
    throw new Error("Booking not found");
  }

  if (String(booking.user) !== String(req.user._id)) {
    res.status(403);
    throw new Error("Only the booking customer can review this job");
  }

  const reviewableStatuses = ["ACCEPTED", "ON_THE_WAY", "IN_PROGRESS", "COMPLETED"];
  if (!reviewableStatuses.includes(booking.bookingStatus)) {
    res.status(400);
    throw new Error("Only accepted or completed bookings can be reviewed");
  }

  let sentimentValue = "neutral";
  if (comment) {
    const result = sentimentAnalyzer.analyze(comment);
    if (result.score > 0) sentimentValue = "positive";
    else if (result.score < 0) sentimentValue = "negative";
  } else {
    // Fallback: Use rating if no comment
    if (rating >= 4) sentimentValue = "positive";
    else if (rating <= 2) sentimentValue = "negative";
  }

  const review = await Review.create({
    booking: booking._id,
    user: req.user._id,
    provider: booking.provider,
    service: booking.service,
    rating,
    title,
    comment,
    sentiment: sentimentValue
  });


  const providerReviews = await Review.find({ provider: booking.provider });
  const average =
    providerReviews.reduce((sum, item) => sum + item.rating, 0) /
    Math.max(providerReviews.length, 1);

  await Provider.findByIdAndUpdate(booking.provider, {
    ratingAvg: Number(average.toFixed(1)),
    reviewCount: providerReviews.length
  });

  res.status(201).json({ review });
});

export const getProviderReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ provider: req.params.providerId })
    .populate("user", "name avatar")
    .populate("service", "title")
    .sort({ createdAt: -1 });

  res.json({ reviews });
});

export const getMyProviderReviews = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ user: req.user._id });
  if (!provider) {
    res.status(404);
    throw new Error("Provider profile not found");
  }

  const reviews = await Review.find({ provider: provider._id })
    .populate("user", "name avatar")
    .populate("service", "title")
    .sort({ createdAt: -1 });

  res.json({ reviews });
});

export const verifyProviderReview = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ user: req.user._id });
  if (!provider) {
    res.status(404);
    throw new Error("Provider profile not found");
  }

  const review = await Review.findById(req.params.id);
  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }

  if (String(review.provider) !== String(provider._id)) {
    res.status(403);
    throw new Error("You can only verify reviews for your own provider profile");
  }

  review.verifiedByProvider = true;
  await review.save();

  res.json({ review });
});

export const updateReview = asyncHandler(async (req, res) => {
  const { rating, comment, title } = req.body;
  const review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }

  if (String(review.user) !== String(req.user._id)) {
    res.status(403);
    throw new Error("You can only edit your own reviews");
  }

  if (rating) review.rating = rating;
  if (title) review.title = title;

  if (comment !== undefined && comment !== review.comment) {
    review.comment = comment;
    review.sentiment = analyzeSentiment(comment, review.rating);

    // Fallback if empty comment
    if (!comment) {
      if (review.rating >= 4) review.sentiment = "positive";
      else if (review.rating <= 2) review.sentiment = "negative";
      else review.sentiment = "neutral";
    }
  }

  await review.save();

  // Update provider average
  const providerReviews = await Review.find({ provider: review.provider });
  const average =
    providerReviews.reduce((sum, item) => sum + item.rating, 0) /
    Math.max(providerReviews.length, 1);

  await Provider.findByIdAndUpdate(review.provider, {
    ratingAvg: Number(average.toFixed(1)),
    reviewCount: providerReviews.length
  });

  res.json({ review });
});
