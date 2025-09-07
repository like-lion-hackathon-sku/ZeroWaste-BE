import { Router } from "express";
import {
  ensureRestaurantCtrl,
  getRestaurantDetailCtrl,
  getRestaurantExternalDetailCtrl,
} from "../controller/restaurants.controller.js";
import { getNearbyRestaurantsCtrl } from "../controller/nearby.controller.js";

const r = Router();

/** 네이버 기반 식당 검색 */
r.get("/nearby", getNearbyRestaurantsCtrl);
/** DB 상세조회 */
r.get("/:restaurantId", getRestaurantDetailCtrl);
/** 네이버 외부 상세 (메뉴/사진) */
r.get("/:restaurantId/external", getRestaurantExternalDetailCtrl);
/** 식당 확보(멱등) */
r.put("/", ensureRestaurantCtrl);

export default r;
