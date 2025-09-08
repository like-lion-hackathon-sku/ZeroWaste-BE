// 위치: src/favorites/router/favorites.router.js
import { Router } from "express";
import {
  upsertFavorite,
  removeFavoriteById,
  listMyFavoritesCtrl,
} from "../controller/favorites.controller.js";
import { authenticateAccessToken } from "../../auth/middleware/auth.middleware.js";

const r = Router();

/* ───────── 공통 유틸 ───────── */
function onlyDigits404(req, res, next) {
  const { restaurantId } = req.params;
  if (restaurantId !== undefined && !/^\d+$/.test(String(restaurantId))) {
    return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  }
  next();
}
function requireAuth(req, res, next) {
  if (!req.user?.id) {
    return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
  }
  next();
}
r.use(authenticateAccessToken);
/* ───────── 미들웨어 ───────── */
r.use(requireAuth);

/* ───────── 라우트 ───────── */

/**
 * #swagger.tags = ['Favorites']
 * #swagger.summary = '내 즐겨찾기 목록'
 * #swagger.security = [{ bearerAuth: [] }]
 * #swagger.parameters['page'] = { in: 'query', schema: { type: 'integer', example: 1 } }
 * #swagger.parameters['size'] = { in: 'query', schema: { type: 'integer', example: 12 } }
 * #swagger.responses[200] = {
 *   description: '목록 조회 성공',
 *   schema: {
 *     resultType: 'SUCCESS',
 *     error: null,
 *     success: {
 *       items: [
 *         {
 *           restaurant_id: 1,
 *           name: '바람난오리궁뎅이',
 *           is_favorite: true,
 *           created_at: '2025-09-05T12:00:00.000Z'
 *         }
 *       ],
 *       pageInfo: { page: 1, size: 12, total: 34 }
 *     }
 *   }
 * }
 */
r.get("/", listMyFavoritesCtrl);

/**
 * #swagger.tags = ['Favorites']
 * #swagger.summary = '즐겨찾기 추가(멱등)'
 * #swagger.description = `
 * • DB에 식당이 이미 있으면 restaurantId 로 바로 추가<br/>
 * • 없으면 place payload로 내부 식당을 동기화한 뒤 추가<br/>
 * • 멱등 동작: 이미 즐겨찾기면 created=false`
 * #swagger.security = [{ bearerAuth: [] }]
 * #swagger.requestBody = {
 *   required: true,
 *   content: {
 *     "application/json": {
 *       schema: {
 *         type: "object",
 *         oneOf: [
 *           { properties: { restaurantId: { type: "integer", example: 55 } }, required: ["restaurantId"] },
 *           { properties: { place: {
 *               type: "object",
 *               example: {
 *                 externalId: "naver:12345",
 *                 name: "봉화묵집",
 *                 category: "Korean",
 *                 address: "서울 성북구 ...",
 *                 mapx: 1270107125,
 *                 mapy: 376027154,
 *                 telephone: "02-000-0000"
 *               }
 *           }}, required: ["place"] }
 *         ]
 *       }
 *     }
 *   }
 * }
 * #swagger.responses[200] = {
 *   description: '멱등 추가 결과',
 *   schema: {
 *     resultType: 'SUCCESS',
 *     error: null,
 *     success: { restaurantId: 55, created: true }
 *   }
 * }
 */
r.put("/", upsertFavorite);

/**
 * #swagger.tags = ['Favorites']
 * #swagger.summary = '즐겨찾기 삭제'
 * #swagger.security = [{ bearerAuth: [] }]
 * #swagger.parameters['restaurantId'] = {
 *   in: 'path', required: true, schema: { type: 'integer', example: 55 }
 * }
 * #swagger.responses[200] = {
 *   description: '삭제 성공(멱등: 존재하지 않아도 에러 아님)',
 *   schema: { resultType: 'SUCCESS', error: null, success: true }
 * }
 */
r.delete("/:restaurantId", onlyDigits404, removeFavoriteById);

export default r;
