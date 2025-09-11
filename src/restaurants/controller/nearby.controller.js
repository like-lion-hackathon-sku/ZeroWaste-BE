import { StatusCodes } from "http-status-codes";
import { searchLocal } from "../service/naver.service.js";
import { ensureRestaurant } from "../service/restaurants.service.js";
import { getRestaurantScore } from "../service/score.service.js";

// 안전 import: named export가 없을 때를 대비
import * as Cat from "../service/category.mapper.js";

const SKIP_CATEGORY_FILTER = process.env.SKIP_CATEGORY_FILTER === "1";
const SKIP_DB_SAVE = process.env.SKIP_DB_SAVE === "1";

// fallback: 필터 없으면 모두 통과시켜서 서비스 죽지 않게
const safeIsRestaurantLike =
  typeof Cat.isRestaurantLike === "function"
    ? Cat.isRestaurantLike
    : () => true;

export const getNearbyRestaurantsCtrl = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ resultType: "FAIL", error: "QUERY_REQUIRED", success: null });
    }

    const places = await searchLocal(q, 10);
    const raw = Array.isArray(places) ? places : [];

    const filtered = SKIP_CATEGORY_FILTER
      ? raw
      : raw.filter((p) => {
          try {
            return safeIsRestaurantLike(p?.category, p?.name);
          } catch {
            return true;
          } // 필터 에러 시 통과
        });

    // 중복 제거 (이름+주소)
    const uniq = [];
    const seen = new Set();
    for (const p of filtered) {
      const key = `${p?.name ?? ""}__${p?.address ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push(p);
    }

    if (SKIP_DB_SAVE) {
      return res.status(StatusCodes.OK).json({
        resultType: "SUCCESS",
        error: null,
        success: {
          items: uniq.map((p, i) => ({
            restaurantId: 0 - i,
            ...p,
            score: null,
          })),
        },
      });
    }

    const items = [];
    for (const p of uniq) {
      try {
        const { restaurantId } = await ensureRestaurant({ place: p });
        const score = await getRestaurantScore(restaurantId);
        items.push({ restaurantId, ...p, score });
      } catch (e) {
        console.error("[nearby] per-item error:", e?.message, {
          name: p?.name,
          addr: p?.address,
        });
      }
    }

    return res.status(StatusCodes.OK).json({
      resultType: "SUCCESS",
      error: null,
      success: { items },
    });
  } catch (e) {
    console.error("[nearby] fatal:", e);
    next(e);
  }
};
