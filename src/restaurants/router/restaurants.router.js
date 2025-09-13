// 위치: src / restaurants / router /restaurants.router.js
import { Router } from "express";
import {
  ensureRestaurantCtrl,
  getRestaurantDetailCtrl,
} from "../controller/restaurants.controller.js";
import { getNearbyRestaurantsCtrl } from "../controller/nearby.controller.js";
import { identifyAccessToken } from "../../auth/middleware/auth.middleware.js";
import { handleGetRestaurantReviews } from "../controller/restaurant-reviews.controller.js";

const r = Router({ mergeParams: true });

/**
 * restaurantId 파라미터 검증 미들웨어
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {*}
 */
function onlyDigits404(req, res, next) {
  const { restaurantId } = req.params;
  if (restaurantId !== undefined && !/^\d+$/.test(String(restaurantId))) {
    return res
      .status(404)
      .json({ resultType: "FAILURE", error: "NOT_FOUND", success: null });
  }
  next();
}

/**
 * GET /restaurants/nearby
 *
 * 네이버 API를 이용한 주변 식당 검색
 *
 * @route GET /restaurants/nearby
 * @query {string} q - 검색어
 * @returns {200} JSON { resultType:"SUCCESS", success:[...restaurants], error:null }
 */
r.get("/nearby", getNearbyRestaurantsCtrl);

/**
 * GET /restaurants/:restaurantId/detail
 *
 * DB 기준 식당 상세 조회
 *
 * @route GET /restaurants/{restaurantId}/detail
 * @param {number} restaurantId.path.required - 식당 ID
 * @returns {200} JSON { resultType:"SUCCESS", success:{...restaurant}, error:null }
 * @returns {404} JSON { resultType:"FAILURE", error:"NOT_FOUND" }
 */
r.get("/:restaurantId/detail", onlyDigits404, getRestaurantDetailCtrl);

/**
 * GET /restaurants/:restaurantId
 *
 * DB 기준 식당 상세 조회 (호환 라우트)
 *
 * @route GET /restaurants/{restaurantId}
 * @param {number} restaurantId.path.required - 식당 ID
 */
r.get("/:restaurantId", onlyDigits404, getRestaurantDetailCtrl);

/**
 * PUT /restaurants
 *
 * 멱등 확보: 식당이 없으면 생성, 있으면 반환
 *
 * @route PUT /restaurants
 * @body {object} place - 외부 Place payload (예: 네이버 API 결과)
 * @returns {200} JSON { resultType:"SUCCESS", success:{restaurantId,...}, error:null }
 */
r.put("/", ensureRestaurantCtrl);

/**
 * GET /restaurants/:restaurantId/reviews
 *
 * 특정 식당 리뷰 목록 조회
 * - 로그인은 선택 사항 (identifyAccessToken 사용 → 쿠키/헤더 있으면 payload 세팅)
 *
 * @route GET /restaurants/{restaurantId}/reviews
 * @param {number} restaurantId.path.required - 식당 ID
 * @query {number} [page=1] - 페이지 번호
 * @query {number} [size=20] - 페이지 크기
 * @query {"latest"|"rating"} [sort="latest"] - 정렬 기준
 * @query {number} [rating] - 별점 필터
 * @returns {200} JSON { resultType:"SUCCESS", success:{ items, pageInfo }, error:null }
 * @returns {404} JSON { resultType:"FAILURE", error:"NOT_FOUND" }
 */
r.get(
  "/:restaurantId/reviews",
  identifyAccessToken, // 쿠키/헤더 있으면 payload 세팅
  onlyDigits404,
  handleGetRestaurantReviews,
);

export default r;
