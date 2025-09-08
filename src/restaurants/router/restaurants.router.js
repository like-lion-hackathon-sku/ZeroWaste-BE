// src/restaurants/router/restaurants.router.js
import { Router } from "express";
import {
  ensureRestaurantCtrl,
  getRestaurantFullDetailCtrl, // 탭용 통합 응답을 반환
} from "../controller/restaurants.controller.js";
import { getNearbyRestaurantsCtrl } from "../controller/nearby.controller.js";

const r = Router();

/** 네이버 검색 */
r.get("/nearby", getNearbyRestaurantsCtrl);

/** FE 탭 UI용 상세조회 (경로를 /detail 로) */
r.get("/:restaurantId/detail", getRestaurantFullDetailCtrl);

/** 식당 확보(멱등) */
r.put("/", ensureRestaurantCtrl);

export default r;
