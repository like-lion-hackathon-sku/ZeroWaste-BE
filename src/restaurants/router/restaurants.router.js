import { Router } from "express";
import {
  ensureRestaurantCtrl,
  getRestaurantDetailCtrl,
} from "../controller/restaurants.controller.js";
import { getNearbyRestaurantsCtrl } from "../controller/nearby.controller.js";

const r = Router();

/* 인증 미들웨어(프로젝트 공용으로 교체 가능) */
function requireAuth(req, res, next) {
  if (!req.user?.id)
    return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
  next();
}
r.use(requireAuth);

/*
  #swagger.tags = ['Restaurants']
  #swagger.security = [{ bearerAuth: [] }]
*/

/** 식당 확보(멱등) */
r.put("/", ensureRestaurantCtrl);

/** 식당 상세조회 */
r.get("/:restaurantId", getRestaurantDetailCtrl);

/** 네이버 기반 식당 검색 (현 지도/검색어) */
r.get("/nearby", getNearbyRestaurantsCtrl);

export default r;
