import express from "express";
import { createOrder, verifyPayment } from "../controllers/paymentController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);
router.post("/orders/:bookingId", authorize("USER"), createOrder);
router.post("/verify", authorize("USER"), verifyPayment);

export default router;

