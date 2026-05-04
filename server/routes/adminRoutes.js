import express from "express";
import {
  createAdmin,
  getBookingsAdmin,
  getComplaints,
  getDashboardStats,
  getPlatformSettings,
  getUsers,
  issueActionToUser,
  updatePlatformSettings,
  updateUser,
  deleteUser
} from "../controllers/adminController.js";


import {
  approveProvider,
  getProviderAdminDetails,
  getProvidersAdmin,
  removeProviderApproval,
  rejectProvider
} from "../controllers/adminProviderController.js";
import { authorize, checkAdminRole, requireAuth } from "../middleware/auth.js";

import {
  deleteReviewAdmin,
  getReviewStats,
  getReviewsAdmin
} from "../controllers/adminReviewController.js";

const router = express.Router();

router.use(requireAuth, checkAdminRole());

router.get("/dashboard", getDashboardStats);
router.get("/users", getUsers);
router.get("/providers", getProvidersAdmin);
router.get("/provider/:id", getProviderAdminDetails);
router.patch("/users/:userId", updateUser);
router.delete("/users/:userId", deleteUser);
router.get("/bookings", getBookingsAdmin);

router.put("/provider/:id/approve", approveProvider);
router.put("/provider/:id/remove-approval", removeProviderApproval);
router.put("/provider/:id/reject", rejectProvider);
router.patch("/providers/:providerId/approve", approveProvider);
router.get("/reviews", getReviewsAdmin);
router.get("/reviews/stats", getReviewStats);
router.delete("/reviews/:id", deleteReviewAdmin);
router.get("/complaints", getComplaints);
router.post("/users/action", issueActionToUser);
router.get("/settings", getPlatformSettings);


router.patch("/settings", authorize("SUPER_ADMIN"), updatePlatformSettings);
router.post("/admins", authorize("SUPER_ADMIN"), createAdmin);

export default router;
