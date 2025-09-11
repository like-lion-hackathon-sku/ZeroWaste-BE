import { Router } from "express";
import {
  ensureRestaurantCtrl,
  getRestaurantDetailCtrl,
} from "../controller/restaurants.controller.js";
import { getNearbyRestaurantsCtrl } from "../controller/nearby.controller.js";

const r = Router();

r.get("/nearby", getNearbyRestaurantsCtrl); // 네이버 검색 + 멱등 확보
r.get("/:restaurantId/detail", getRestaurantDetailCtrl); // DB 상세만
r.get("/:restaurantId", getRestaurantDetailCtrl); // 호환 라우트
r.put("/", ensureRestaurantCtrl); // 멱등 확보

export default r;
