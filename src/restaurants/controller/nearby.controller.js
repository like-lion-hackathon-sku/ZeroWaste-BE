// 위치: src/restaurants/controller/nearby.controller.js
import { StatusCodes } from "http-status-codes";
import { searchLocal } from "../service/naver.service.js";
import { ensureRestaurant } from "../service/restaurants.service.js";
import { getRestaurantScore } from "../service/score.service.js";

/**
 * GET /api/restaurants/nearby?q=검색어
 * - 네이버 API 검색 → DB 멱등 등록 → 점수 조인
 */
export const getNearbyRestaurantsCtrl = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: "QUERY_REQUIRED" });
    }

    // 1. 네이버 검색
    const places = await searchLocal(q, 20);

    // 2. DB 멱등 등록 + 점수 조인
    const items = [];
    for (const p of places) {
      const { restaurantId } = await ensureRestaurant({ place: p });
      const score = await getRestaurantScore(restaurantId);
      items.push({ restaurantId, ...p, score });
    }

    return res.status(StatusCodes.OK).json({
      resultType: "SUCCESS",
      error: null,
      success: { items },
    });
  } catch (e) {
    next(e);
  }
};
