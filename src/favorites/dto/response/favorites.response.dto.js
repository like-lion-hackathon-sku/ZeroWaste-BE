// 위치: src/favorites/router/favorites.router.js
import { Router } from "express";
import {
  upsertFavorite,
  removeFavoriteById,
  listMyFavoritesCtrl,
} from "../controller/favorites.controller.js";
import {
  authenticateAccessToken,
  verifyUserIsActive,
} from "../../auth/middleware/auth.middleware.js";

const r = Router();

/* ───────── 공통 유틸 ───────── */
function onlyDigits404(req, res, next) {
  const { restaurantId } = req.params;
  if (restaurantId !== undefined && !/^\d+$/.test(String(restaurantId))) {
    return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  }
  next();
}

/* ───────── 라우트 ───────── */
r.get("/", listMyFavoritesCtrl);

r.put("/", upsertFavorite);

r.delete("/:restaurantId", onlyDigits404, removeFavoriteById);

export default r;
