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

/* 즐겨찾기 조회 라우터
 * 매서드: GET
 * 엔드포인트: /api/favorites
 */
r.get("/", listMyFavoritesCtrl);

/* 즐겨찾기 추가 라우터
 * 매서드: PUT
 * 엔드포인트: /api/favorites
 */

r.put("/", upsertFavorite);

/* 즐겨찾기 삭제 라우터
 * 매서드: PUT
 * 엔드포인트: /api/favorites/delete
 */
r.delete("/:restaurantId", onlyDigits404, removeFavoriteById);

export default r;
