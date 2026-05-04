import express from "express";
import {
  acceptBooking,
  completeBooking,
  createBooking,
  getActionHistory,
  acknowledgeAction,
  getMyBookings,
  raiseComplaint,
  rejectBooking,
  resolveComplaint,
  getBookingById,
  updateBookingStatus,
  updateBooking,
  cancelBooking
} from "../controllers/bookingController.js";

import { authorize, protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.post("/", authorize("USER"), createBooking);
router.get("/mine", getMyBookings);
router.get("/action-history", getActionHistory);
router.post("/acknowledge-action", acknowledgeAction);
router.get("/:id", getBookingById);

router.patch("/:id", authorize("USER"), updateBooking);
router.patch("/:id/cancel", cancelBooking);
router.patch("/:id/status", authorize("PROVIDER", "ADMIN", "SUPER_ADMIN"), updateBookingStatus);
router.put("/:id/accept", authorize("PROVIDER", "ADMIN", "SUPER_ADMIN"), acceptBooking);
router.put("/:id/complete", authorize("PROVIDER", "ADMIN", "SUPER_ADMIN"), completeBooking);
router.put("/:id/reject", authorize("PROVIDER", "ADMIN", "SUPER_ADMIN"), rejectBooking);
router.post("/:id/complaint", authorize("PROVIDER"), raiseComplaint);
router.patch("/:id/resolve-complaint", authorize("PROVIDER"), resolveComplaint);


export default router;
