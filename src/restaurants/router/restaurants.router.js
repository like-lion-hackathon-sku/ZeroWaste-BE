// 위치: src / restaurants / router / restaurants.router.js
import { Router } from "express";
import {
  ensureRestaurantCtrl,
  getRestaurantDetailCtrl,
} from "../controller/restaurants.controller.js";
import { getNearbyRestaurantsCtrl } from "../controller/nearby.controller.js";
import { optionalAuth } from "../../auth/middleware/optionalAuth.js";

const r = Router();

// ✅ 공개: 목록(nearby)
r.get("/nearby", getNearbyRestaurantsCtrl);

// ✅ 공개 + 로그인 시에만 isFavorite 계산(옵셔널)
r.get("/:restaurantId/detail", optionalAuth, getRestaurantDetailCtrl);
r.get("/:restaurantId", optionalAuth, getRestaurantDetailCtrl);

// ✅ 멱등 확보는 FE 내부 호출용이면 공개 유지(또는 관리자만 보호)
r.put("/", ensureRestaurantCtrl);

export default r;
