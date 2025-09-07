// 위치: src/restaurants/router/restaurants.router.js
import { Router } from "express";
import {
  ensureRestaurantCtrl,
  getRestaurantFullDetailCtrl,
} from "../controller/restaurants.controller.js";
import { getNearbyRestaurantsCtrl } from "../controller/nearby.controller.js";

const r = Router();

// 네이버 검색
r.get("/nearby", getNearbyRestaurantsCtrl);

// 식당 상세조회
r.get("/:restaurantId/detail", getRestaurantFullDetailCtrl);

r.get("/:restaurantId", getRestaurantFullDetailCtrl);

/** 식당 확보(멱등) */
r.put("/", ensureRestaurantCtrl);

export default r;
