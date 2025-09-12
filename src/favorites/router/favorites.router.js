// 위치: src / favorites / router / favorites.router.js
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

// 🔐 즐겨찾기 전체는 로그인 필수
r.use(authenticateAccessToken, verifyUserIsActive);

/* restaurantId 파라미터 검증 */
function onlyDigits404(req, res, next) {
  const { restaurantId } = req.params;
  if (restaurantId !== undefined && !/^\d+$/.test(String(restaurantId))) {
    return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  }
  next();
}

r.get("/", listMyFavoritesCtrl);
r.post("/", upsertFavorite); // POST 허용
r.put("/", upsertFavorite); // PUT도 유지
r.delete("/:restaurantId", onlyDigits404, removeFavoriteById);

export default r;
