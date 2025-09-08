// 위치: src/restaurants/controller/nearby.controller.js
import { StatusCodes } from "http-status-codes";
import { searchLocal } from "../service/naver.service.js";
import {
  ensureRestaurant,
  getRestaurantFullDetail,
} from "../service/restaurants.service.js";
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
  const s = String(cat || "").toLowerCase();
  return (
    RESTAURANT_CATS.some((kw) => s.includes(kw.toLowerCase())) ||
    s.includes("음식점")
  );
}

/** GET /api/restaurants/nearby */
export const getNearbyRestaurantsCtrl = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "QUERY_REQUIRED" });

    // 1) 네이버 검색
    const places = await searchLocal(q, 5);

    // 2) 식당/카페 등만 통과
    const filtered = places.filter((p) => isRestaurantCategory(p?.category));

    // 3) 이름+주소 기준 중복 제거
    const uniq = [];
    const seen = new Set();
    for (const p of filtered) {
      const key = `${p.name}__${p.address}`;
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push(p);
    }

    // 4) DB 멱등 확보 + 점수 조인
    const items = [];
    for (const p of uniq) {
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

/** GET /api/restaurants/:restaurantId/detail */
export const getRestaurantFullDetailCtrl = async (req, res, next) => {
  try {
    const restaurantId = Number(req.params.restaurantId);
    // 필요 시 ensure: id가 있으면 해당 레코드 확보(없으면 생성 or 404 정책 선택)
    const restaurant = await ensureRestaurant({ restaurantId });
    const payload = await getRestaurantFullDetail({ restaurant });
    return res.json({ resultType: "SUCCESS", error: null, success: payload });
  } catch (e) {
    next(e);
  }
};
