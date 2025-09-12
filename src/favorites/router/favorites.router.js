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

// 🔐 이 라우터 아래는 로그인 필수
r.use(authenticateAccessToken, verifyUserIsActive);

/* restaurantId 파라미터 검증 함수
 * restaurantId가 숫자가 아니면 404 응답
 */
function onlyDigits404(req, res, next) {
  const { restaurantId } = req.params;
  if (restaurantId !== undefined && !/^\d+$/.test(String(restaurantId))) {
    return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  }
  next();
}

r.get("/", listMyFavoritesCtrl);
r.post("/", upsertFavorite); // ✅ POST 허용
r.put("/", upsertFavorite); // (PUT도 유지)
r.delete("/:restaurantId", onlyDigits404, removeFavoriteById);
r.get(
  "/:restaurantId/reviews",
  identifyAccessToken,
  onlyDigits404,
  listRestaurantReviewsCtrl,
);
export default r;
