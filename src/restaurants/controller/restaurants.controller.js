// 위치: src / restaurants / controller / restaurans.controller.js
import { StatusCodes } from "http-status-codes";
import {
  ensureRestaurant,
  getRestaurantDetail,
} from "../service/restaurants.service.js";

/**
 * PUT /api/restaurants
 *
 * 식당 멱등 확보 컨트롤러
 * - restaurantId 또는 place payload로 DB에 보장
 * - 존재하지 않으면 생성, 있으면 기존 ID 반환
 *
 * @async
 * @function ensureRestaurantCtrl
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 *
 * @body {number} [restaurantId] - 기존 식당 ID (선택)
 * @body {object} [place] - 외부 place payload (name, address 필수)
 *
 * @returns {Promise<void>}
 *
 * @example 성공 응답
 * {
 *   "resultType": "SUCCESS",
 *   "error": null,
 *   "success": {
 *     "restaurantId": 12,
 *     "created": true
 *   }
 * }
 */
export const ensureRestaurantCtrl = async (req, res, next) => {
  try {
    const { restaurantId, place } = req.body ?? {};
    const result = await ensureRestaurant({ restaurantId, place });

    if (typeof res.success === "function")
      return res.success(result, StatusCodes.OK);

    return res
      .status(StatusCodes.OK)
      .json({ resultType: "SUCCESS", error: null, success: result });
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/restaurants/:restaurantId/detail
 *
 * DB에 저장된 특정 식당 상세 조회 컨트롤러
 * - 존재하지 않으면 404 반환
 * - 로그인 사용자는 즐겨찾기 여부 포함
 *
 * @async
 * @function getRestaurantDetailCtrl
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 *
 * @param {string} req.params.restaurantId - 식당 ID
 *
 * @returns {Promise<void>}
 *
 * @example 성공 응답
 * {
 *   "resultType": "SUCCESS",
 *   "error": null,
 *   "success": {
 *     "id": 3,
 *     "name": "한식당",
 *     "category": "KOREAN",
 *     "address": "서울시 강남구...",
 *     "telephone": "02-123-4567",
 *     "mapx": 127.12345,
 *     "mapy": 37.54321,
 *     "isSponsored": false,
 *     "stats": {
 *       "reviews": 10,
 *       "photos": 8,
 *       "avgLeftoverRatio": 0.15,
 *       "ecoScore": 4.2
 *     },
 *     "isFavorite": true
 *   }
 * }
 *
 * @example 실패 응답 (잘못된 restaurantId)
 * {
 *   "ok": false,
 *   "error": "NOT_FOUND"
 * }
 */
export const getRestaurantDetailCtrl = async (req, res, next) => {
  try {
    const restaurantId = Number(req.params.restaurantId);
    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    const userId = req.user?.id ?? null;
    const dbDetail = await getRestaurantDetail(restaurantId, userId);

    return res.status(StatusCodes.OK).json({
      resultType: "SUCCESS",
      error: null,
      success: dbDetail,
    });
  } catch (e) {
    next(e);
  }
};

/* ===================== DTO ===================== */

/**
 * EnsureRestaurant 요청 DTO
 */
export class EnsureRestaurantRequestDto {
  /**
   * @param {{restaurantId?:number, place?:object}} body
   */
  constructor(body) {
    /** @type {number|null} */
    this.restaurantId = body?.restaurantId ?? null;
    /** @type {object|null} */
    this.place = body?.place ?? null;
  }
}

/**
 * EnsureRestaurant 응답 DTO
 */
export class EnsureRestaurantResponseDto {
  /**
   * @param {{ restaurantId:number, created:boolean }} result
   */
  constructor(result) {
    /** @type {number} */
    this.restaurantId = result.restaurantId;
    /** @type {boolean} */
    this.created = result.created;
  }
}
