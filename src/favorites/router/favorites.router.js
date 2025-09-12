// src/favorites/router/favorites.router.js
import { Router } from "express";
import {
  listMyFavoritesCtrl,
  upsertFavorite,
  removeFavoriteById,
} from "../controller/favorites.controller.js";
import {
  authenticateAccessToken,
  verifyUserIsActive,
} from "../../auth/middleware/auth.middleware.js";
import { tokenBridge } from "../../auth/middleware/token-bridge.middleware.js";

const r = Router({ mergeParams: true });

// ✅ 순서: tokenBridge → authenticate → verifyActive
r.use(tokenBridge, authenticateAccessToken, verifyUserIsActive);

// ✅ 경로
r.get("/", listMyFavoritesCtrl);
r.post("/", upsertFavorite);
r.delete("/:restaurantId", removeFavoriteById);

// ✅ CORS preflight 404 방지 (옵션)
r.options("*", (req, res) => res.sendStatus(204));

export default r; // ★ 반드시 default export
