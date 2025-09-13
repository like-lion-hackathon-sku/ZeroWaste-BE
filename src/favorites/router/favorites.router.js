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

/**
 * 즐겨찾기 라우터
 *
 * 모든 라우트는 인증된 사용자만 접근 가능합니다.
 * AccessToken 인증과 사용자 활성화 여부를 검증합니다.
 */
r.use(authenticateAccessToken, verifyUserIsActive);

/**
 * @function onlyDigits404
 * @description restaurantId 파라미터가 숫자가 아닐 경우 404 응답을 반환합니다.
 * @param {import("express").Request} req Express Request 객체
 * @param {import("express").Response} res Express Response 객체
 * @param {import("express").NextFunction} next Express Next 함수
 */
function onlyDigits404(req, res, next) {
  const { restaurantId } = req.params;
  if (restaurantId !== undefined && !/^\d+$/.test(String(restaurantId))) {
    return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  }
  next();
}

/**
 * GET /api/favorites
 * @summary 내 즐겨찾기 목록 조회
 * @tags Favorites
 * @security bearerAuth
 * @response 200 - 성공 시 즐겨찾기 목록 반환
 */
r.get("/", listMyFavoritesCtrl);

/**
 * POST /api/favorites
 * @summary 즐겨찾기 추가 (idempotent: 이미 있으면 갱신)
 * @tags Favorites
 * @security bearerAuth
 * @body {object} FavoriteCreateRequestDto
 * @response 200 - 성공 시 추가된 즐겨찾기 반환
 */
r.post("/", upsertFavorite);

/**
 * PUT /api/favorites
 * @summary 즐겨찾기 추가/갱신 (POST와 동일 기능 유지)
 * @tags Favorites
 * @security bearerAuth
 * @body {object} FavoriteCreateRequestDto
 * @response 200 - 성공 시 갱신된 즐겨찾기 반환
 */
r.put("/", upsertFavorite);

/**
 * DELETE /api/favorites/:restaurantId
 * @summary 특정 식당의 즐겨찾기 제거
 * @tags Favorites
 * @security bearerAuth
 * @param {number} restaurantId.path.required - 식당 ID
 * @response 200 - 성공 시 제거 완료 메시지 반환
 * @response 404 - restaurantId가 유효하지 않음
 */
r.delete("/:restaurantId", onlyDigits404, removeFavoriteById);

export default r;
