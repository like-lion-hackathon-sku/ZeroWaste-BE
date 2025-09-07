// 위치: src/restaurants/controller/nearby.controller.js
import { StatusCodes } from "http-status-codes";
import { searchLocal } from "../service/naver.service.js";
import { ensureRestaurant } from "../service/restaurants.service.js";
import { getRestaurantScore } from "../service/score.service.js";

const RESTAURANT_CATS = [
  "한식",
  "중식",
  "일식",
  "양식",
  "퓨전",
  "분식",
  "패스트푸드",
  "고기",
  "돼지고기",
  "소고기",
  "곱창",
  "전골",
  "찌개",
  "국밥",
  "치킨",
  "피자",
  "버거",
  "샌드위치",
  "베트남",
  "태국",
  "인도",
  "중동",
  "이탈리아",
  "멕시코",
  "브라질",
  "스페인",
  "디저트",
  "카페",
  "커피",
  "제과",
  "제빵",
  "빵",
  "베이커리",
  "아시아음식",
  "샤브샤브",
  "뷔페",
  "해산물",
  "횟집",
  "초밥",
  "포차",
  "술집",
  "호프",
];

function isRestaurantCategory(cat = "") {
  const s = String(cat).toLowerCase();
  return (
    RESTAURANT_CATS.some((kw) => s.includes(kw.toLowerCase())) ||
    s.includes("음식점")
  );
}

export const getNearbyRestaurantsCtrl = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "QUERY_REQUIRED" });

    // 1) 네이버 검색 (최대 5개)
    const raw = await searchLocal(q, 5);

    // 2) 음식점만 선별
    const places = raw.filter((p) => isRestaurantCategory(p.category));

    // 3) DB 멱등 등록 + 점수 조인
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
