import express from "express";
import { getMe, login, register, updateProfile } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { uploadFields } from "../middleware/multer.js";

const router = express.Router();

router.post("/register", uploadFields, register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.put("/profile", protect, uploadFields, updateProfile);

export default router;
