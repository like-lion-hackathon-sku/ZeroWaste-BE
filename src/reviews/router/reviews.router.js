import express from "express";
import { authenticateAccessToken } from "../../auth/middleware/auth.middleware.js";
import {
  handleCreateReviews,
  handleGetMyReviews,
  handleUpdateReviews,
  handleDeleteReviews,
} from "../controller/reviews.controller.js";

const router = express.Router();
router.post(
  "/restaurants/:id/reviews",
  authenticateAccessToken,
  handleCreateReviews
);
router.put("/:reviewId", authenticateAccessToken, handleUpdateReviews);
router.delete("/:reviewId", authenticateAccessToken, handleDeleteReviews);
router.get("/me", authenticateAccessToken, handleGetMyReviews);

export default router;
