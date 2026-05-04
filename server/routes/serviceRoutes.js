import express from "express";
import {
  createService,
  getFeaturedServices,
  getServiceBySlug,
  getServices,
  updateService
} from "../controllers/serviceController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/", getServices);
router.get("/featured", getFeaturedServices);
router.get("/:slug", getServiceBySlug);
router.post("/", protect, authorize("ADMIN", "SUPER_ADMIN"), createService);
router.patch("/:id", protect, authorize("ADMIN", "SUPER_ADMIN"), updateService);

export default router;

