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

/* 즐겨찾기 라우터 공통 보안 미들웨어
 * - 이 라우터 이하의 모든 API는 반드시 로그인한 사용자만 접근 가능
 * - 먼저 AccessToken을 검증해서 유효한 사용자임을 확인
 * - 이후 verifyUserIsActive로 비활성/차단된 계정을 차단
 * 요약: "인증된 정상 사용자"만 즐겨찾기 API를 호출할 수 있도록 보장
 */
r.use(authenticateAccessToken, verifyUserIsActive);

/* restaurantId 파라미터 검증 미들웨어
 * - restaurantId가 숫자가 아닐경우 404 반환
 */
function onlyDigits404(req, res, next) {
  const { restaurantId } = req.params;
  if (restaurantId !== undefined && !/^\d+$/.test(String(restaurantId))) {
    return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  }
  next();
}

/* 내 즐겨찾기 목록 조회 라우터
 * 매서드: GET
 * 엔드포인트: /api/favorites
 */
r.get("/", listMyFavoritesCtrl);

/* 즐겨찾기 추가 라우터
 * 매서드: POST
 * 엔드포인트: /api/favorites
 */
r.post("/", upsertFavorite);

/* 즐겨찾기 추가 라우터
 * 매서드: PUT
 * 엔드포인트: /api/favorites
 */
r.put("/", upsertFavorite);

/* 즐겨찾기 삭제 라우터
 * 매서드: DELETE
 * 엔드포인트: /api/favorites/:restaurantId
 */
r.delete("/:restaurantId", onlyDigits404, removeFavoriteById);

export default r;
