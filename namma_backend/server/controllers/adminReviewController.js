import Review from "../models/Review.js";
import asyncHandler from "../utils/asyncHandler.js";

// @desc    Get all reviews for admin with filtering
// @route   GET /api/admin/reviews
// @access  Private/Admin
export const getReviewsAdmin = asyncHandler(async (req, res) => {
  const { sentiment, providerId, page = 1, limit = 10 } = req.query;

  const query = {};
  if (sentiment) query.sentiment = sentiment;
  if (providerId) query.provider = providerId;
  
  if (req.query.search) {
    query.$or = [
      { title: { $regex: req.query.search, $options: "i" } },
      { comment: { $regex: req.query.search, $options: "i" } }
    ];
  }

  const total = await Review.countDocuments(query);
  const reviews = await Review.find(query)
    .populate("user", "name")
    .populate({
      path: "provider",
      populate: { path: "user", select: "name" }
    })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    reviews,
    page: Number(page),
    pages: Math.ceil(total / limit),
    total
  });
});

// @desc    Get review stats for admin
// @route   GET /api/admin/reviews/stats
// @access  Private/Admin
export const getReviewStats = asyncHandler(async (req, res) => {
  const stats = await Review.aggregate([
    {
      $group: {
        _id: "$sentiment",
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    totalReviews: 0,
    positive: 0,
    negative: 0,
    neutral: 0
  };

  stats.forEach((item) => {
    result.totalReviews += item.count;
    if (item._id === "positive") result.positive = item.count;
    if (item._id === "negative") result.negative = item.count;
    if (item._id === "neutral") result.neutral = item.count;
  });

  res.json(result);
});

// @desc    Delete review (Moderation)
// @route   DELETE /api/admin/reviews/:id
// @access  Private/Admin
export const deleteReviewAdmin = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }

  await review.deleteOne();
  res.json({ message: "Review removed" });
});
