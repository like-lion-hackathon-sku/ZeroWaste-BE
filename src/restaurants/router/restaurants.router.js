import { Router } from "express";
import {
  ensureRestaurantCtrl,
  getRestaurantDetailCtrl,
} from "../controller/restaurants.controller.js";
import { getNearbyRestaurantsCtrl } from "../controller/nearby.controller.js";
import { identifyAccessToken } from "../../auth/middleware/auth.middleware.js";
import { handleGetRestaurantReviews } from "../controller/restaurant-reviews.controller.js";

const r = Router({ mergeParams: true });

/* restaurantId 파라미터 검증 */
function onlyDigits404(req, res, next) {
  const { restaurantId } = req.params;
  if (restaurantId !== undefined && !/^\d+$/.test(String(restaurantId))) {
    return res
      .status(404)
      .json({ resultType: "FAILURE", error: "NOT_FOUND", success: null });
  }
  next();
}

// 네이버 검색 + 멱등 확보
r.get("/nearby", getNearbyRestaurantsCtrl);

// 식당 상세 (DB 기준)
r.get("/:restaurantId/detail", onlyDigits404, getRestaurantDetailCtrl);
r.get("/:restaurantId", onlyDigits404, getRestaurantDetailCtrl);

// 멱등 확보
r.put("/", ensureRestaurantCtrl);

// ✅ 특정 식당 리뷰 조회 (로그인 선택)
r.get(
  "/:restaurantId/reviews",
  identifyAccessToken, // 쿠키/헤더 있으면 payload 세팅
  onlyDigits404,
  handleGetRestaurantReviews,
);

export default r;
