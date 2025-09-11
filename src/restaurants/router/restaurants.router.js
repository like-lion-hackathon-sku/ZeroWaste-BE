import { Router } from "express";
import {
  ensureRestaurantCtrl,
  getRestaurantDetailCtrl,
} from "../controller/restaurants.controller.js";
import { getNearbyRestaurantsCtrl } from "../controller/nearby.controller.js";

const r = Router();

/**
 * @route GET /api/restaurants/nearby
 * @summary 식당 주변 검색
 * @description
 * 쿼리 파라미터(q, x, y, radius 등)를 기반으로 네이버 API/DB에서 인근 식당 리스트를 조회합니다.
 *
 * @tags Restaurants
 * @param {string} q.query - 검색 키워드 (예: "카페")
 * @param {number} x.query - 중심 좌표 X
 * @param {number} y.query - 중심 좌표 Y
 * @param {number} radius.query - 검색 반경 (미터 단위)
 * @returns {Array<Restaurant>} 200 - 성공 시 식당 리스트
 */
r.get("/nearby", getNearbyRestaurantsCtrl);

/**
 * @route GET /api/restaurants/:restaurantId/detail
 * @summary 식당 상세 조회
 * @tags Restaurants
 * @param {number} restaurantId.path.required - 식당 ID
 * @returns {RestaurantDetail} 200 - 성공 시 식당 상세
 * @returns {Error} 404 - 식당 없음
 */
r.get("/:restaurantId/detail", getRestaurantDetailCtrl);

/**
 * @route GET /api/restaurants/:restaurantId
 * @summary 식당 상세 조회 (호환 라우트)
 * @tags Restaurants
 * @param {number} restaurantId.path.required - 식당 ID
 * @returns {RestaurantDetail} 200 - 성공 시 식당 상세
 */
r.get("/:restaurantId", getRestaurantDetailCtrl);

/**
 * @route PUT /api/restaurants
 * @summary 식당 멱등 등록
 * @tags Restaurants
 * @param {EnsureRestaurantRequestDto} request.body.required - 네이버 place 객체
 * @returns {EnsureRestaurantResponseDto} 200 - 등록/조회된 식당 정보
 */
r.put("/", ensureRestaurantCtrl);

export default r;
