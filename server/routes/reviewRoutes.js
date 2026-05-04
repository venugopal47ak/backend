import express from "express";
import { addReview, getProviderReviews, updateReview } from "../controllers/reviewController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/provider/:providerId", getProviderReviews);
router.post("/", protect, authorize("USER"), addReview);
router.patch("/:id", protect, authorize("USER"), updateReview);

export default router;


