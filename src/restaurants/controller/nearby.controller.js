import { StatusCodes } from "http-status-codes";
import { searchLocal } from "../service/naver.service.js";
import { ensureRestaurant } from "../service/restaurants.service.js";
import { getRestaurantScore } from "../service/score.service.js";
import { isRestaurantLike } from "../service/category.mapper.js";

// ✅ 필터/DB 저장을 끌 수 있는 스위치(환경변수)
const SKIP_CATEGORY_FILTER = process.env.SKIP_CATEGORY_FILTER === "1";
const SKIP_DB_SAVE = process.env.SKIP_DB_SAVE === "1";

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

    console.log(
      "[nearby] raw:",
      raw.length,
      "skipFilter?",
      SKIP_CATEGORY_FILTER,
      "skipDb?",
      SKIP_DB_SAVE,
    );

    const filtered = SKIP_CATEGORY_FILTER
      ? raw
      : raw.filter((p) => {
          try {
            return isRestaurantLike(p?.category, p?.name);
          } catch (e) {
            console.warn("[nearby] filter error:", e?.message, p);
            return false;
          }
        });

    console.log("[nearby] filtered:", filtered.length);

    // 중복제거
    const uniq = [];
    const seen = new Set();
    for (const p of filtered) {
      const key = `${p?.name ?? ""}__${p?.address ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push(p);
    }

    // ✅ DB 저장이 원인인지 분리 확인
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
        // 문제 항목은 건너뛰고 계속
      }
    }

    return res.status(StatusCodes.OK).json({
      resultType: "SUCCESS",
      error: null,
      success: { items },
    });
  } catch (e) {
    console.error("[nearby] fatal:", e?.stack || e);
    next(e);
  }
};
