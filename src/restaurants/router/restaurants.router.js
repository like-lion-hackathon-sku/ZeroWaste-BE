import { Router } from "express";
import {
  ensureRestaurantCtrl,
  getRestaurantFullDetailCtrl,
} from "../controller/restaurants.controller.js";
import { getNearbyRestaurantsCtrl } from "../controller/nearby.controller.js";

const r = Router();

/** 네이버 기반 식당 검색 */
r.get("/nearby", getNearbyRestaurantsCtrl);

/** DB + 네이버 통합 상세조회 */
r.get("/:restaurantId/detail", getRestaurantFullDetailCtrl);

/** 식당 확보(멱등) */
r.put("/", ensureRestaurantCtrl);

export default r;
