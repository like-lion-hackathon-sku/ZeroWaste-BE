import { StatusCodes } from "http-status-codes";
import { searchLocal } from "../service/naver.service.js";
import { ensureRestaurant } from "../service/restaurants.service.js";
import { getRestaurantScore } from "../service/score.service.js";
import { isRestaurantLike } from "../service/category.mapper.js"; // ✅ 카테고리 판별 유틸

// GET /api/restaurants/nearby?q=키워드
export const getNearbyRestaurantsCtrl = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ resultType: "FAIL", error: "QUERY_REQUIRED", success: null });
    }

    // 1) 네이버 검색 (필요 시 개수 조절 가능)
    const places = await searchLocal(q, 10);

    // 2) 음식점/카페 계열만 필터링
    const filtered = (places ?? []).filter((p) =>
      isRestaurantLike(p?.category, p?.name),
    );

    // 3) 이름+주소 기준 중복 제거
    const uniq = [];
    const seen = new Set();
    for (const p of filtered) {
      const key = `${p?.name ?? ""}__${p?.address ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push(p);
    }

    // 4) DB 멱등 확보 + 점수 조인
    const items = [];
    for (const p of uniq) {
      const { restaurantId } = await ensureRestaurant({ place: p }); // ✅ 내부에서 FoodCategory 매핑 후 저장
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
