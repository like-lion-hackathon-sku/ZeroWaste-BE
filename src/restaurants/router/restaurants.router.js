// 위치: src/restaurants/router/restaurants.router.js
import { Router } from "express";
import {
  ensureRestaurantCtrl,
  getRestaurantFullDetailCtrl, // 컨트롤러 함수명 유지
} from "../controller/restaurants.controller.js";
import { getNearbyRestaurantsCtrl } from "../controller/nearby.controller.js";

const r = Router();

r.get("/nearby", getNearbyRestaurantsCtrl);
r.get("/:restaurantId/detail", getRestaurantFullDetailCtrl); // OK
r.get("/:restaurantId", getRestaurantFullDetailCtrl); // (원한다면 유지/제거 선택)
r.put("/", ensureRestaurantCtrl);

export default r;
