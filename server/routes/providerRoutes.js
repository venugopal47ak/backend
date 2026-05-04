import express from "express";
import {
  getMyProviderProfile,
  getNearbyProviders,
  getProviderById,
  getProviders,
  getProvidersByService,
  upsertProviderProfile
} from "../controllers/providerController.js";
import { getProviderDashboardStats } from "../controllers/providerDashboardController.js";
import {
  getMyProviderReviews,
  verifyProviderReview
} from "../controllers/reviewController.js";
import { authorize, protect } from "../middleware/auth.js";
import { uploadFields } from "../middleware/multer.js";

const router = express.Router();

router.get("/", getProviders);
router.get("/nearby", getNearbyProviders);
router.get(
  "/dashboard/:providerId",
  protect,
  authorize("PROVIDER", "ADMIN", "SUPER_ADMIN"),
  getProviderDashboardStats
);
router.get("/service/:serviceName", getProvidersByService);
router.get("/by-service/:serviceName", getProvidersByService);
router.get("/me", protect, authorize("PROVIDER"), getMyProviderProfile);
router.get("/reviews", protect, authorize("PROVIDER"), getMyProviderReviews);
router.put("/reviews/:id/verify", protect, authorize("PROVIDER"), verifyProviderReview);
router.post("/me", protect, authorize("PROVIDER"), uploadFields, upsertProviderProfile);

router.get("/:id", getProviderById);

export default router;
