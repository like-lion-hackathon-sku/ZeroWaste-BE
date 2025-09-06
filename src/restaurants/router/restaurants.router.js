import { Router } from "express";
import {
  ensureRestaurantCtrl,
  getRestaurantDetailCtrl,
} from "../controller/restaurants.controller.js";
import { getNearbyRestaurantsCtrl } from "../controller/nearby.controller.js";

const r = Router();

/** 네이버 기반 식당 검색 (현 지도/검색어) */
r.get("/nearby", getNearbyRestaurantsCtrl);

/** 식당 상세조회 */
r.get("/:restaurantId", getRestaurantDetailCtrl);
/** 식당 확보(멱등) */
r.put("/", ensureRestaurantCtrl);

export default r;
