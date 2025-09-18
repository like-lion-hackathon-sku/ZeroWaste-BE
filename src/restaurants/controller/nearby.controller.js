// 위치: src / restaurants / controller / nearby.controller.js
import { StatusCodes } from "http-status-codes";
import { searchLocal } from "../service/naver.service.js";
import { ensureRestaurant } from "../service/restaurants.service.js";
import { getRestaurantScore } from "../service/score.service.js";

/* ---------------------------- 카테고리 화이트리스트 ----------------------------
 * 네이버 검색 결과 중에서 "음식점/카페/주점 계열"만 걸러내기 위해 사용
 * - KR, JP, CN, WEST, SEAFOOD, ASIAN, ... 으로 분류
 * - 나중에 최종 RESTAURANT_CATS 배열에 합쳐서 사용
 */
const KR = [
  /* 한식/분식/국밥 등 */
];
const JP = [
  /* 일식/스시/라멘 등 */
];
const CN = [
  /* 중식/짬뽕/마라탕 등 */
];
const WEST = [
  /* 양식/스테이크/피자 등 */
];
const SEAFOOD = [
  /* 해산물/횟집 등 */
];
const ASIAN = [
  /* 동남아/베트남/태국/인도 등 */
];
const MIDEAST_LATAM = [
  /* 중동/멕시코/브라질/스페인 등 */
];
const CAFE_DESSERT = [
  /* 카페/디저트/베이커리 등 */
];
const PUB_BAR = [
  /* 술집/펍/호프/수제맥주 등 */
];
const MISC = [
  /* 기타 분류 (뷔페/패스트푸드 등) */
];

// 최종 화이트리스트 (중복 제거된 전체 카테고리)
export const RESTAURANT_CATS = [
  ...new Set([
    ...KR,
    ...JP,
    ...CN,
    ...WEST,
    ...SEAFOOD,
    ...ASIAN,
    ...MIDEAST_LATAM,
    ...CAFE_DESSERT,
    ...PUB_BAR,
    ...MISC,
  ]),
];

// ----------------------------- 블랙리스트 -----------------------------
// 네이버 검색 결과에 나오지만 음식점이 아닌 업종들을 제외하기 위한 목록
const RESTAURANT_BLACK = [
  "병원",
  "약국",
  "학원",
  "서점",
  "편의점",
  "마트",
  "은행",
  "헬스장",
  "미용실",
  "호텔",
  "주유소",
  "세탁소",
  "동물병원",
  "우체국",
  "경찰서",
  "학교",
  "대학교" /* … */,
];

// ----------------------------- 유틸 함수 -----------------------------
const norm = (s = "") => String(s).replace(/\s+/g, " ").trim().toLowerCase();
const hasAny = (s, arr) => {
  const n = norm(s);
  return arr.some((t) => n.includes(norm(t)));
};

// ----------------------------- 카테고리 판별 함수 -----------------------------
/* 검색 결과 항목이 "음식점/카페/주점" 계열인지 판별
 * 1) 블랙리스트에 걸리면 제외
 * 2) 화이트리스트에 포함되면 통과
 * 3) 기본 안전망: 네이버 카테고리에 "음식점/카페/주점" 단어가 있으면 통과
 */
export function isRestaurantCategory(cat = "", name = "") {
  if (hasAny(cat, RESTAURANT_BLACK) || hasAny(name, RESTAURANT_BLACK))
    return false;
  if (hasAny(cat, RESTAURANT_CATS) || hasAny(name, RESTAURANT_CATS))
    return true;
  return (
    norm(cat).includes("음식점") ||
    norm(cat).includes("카페") ||
    norm(cat).includes("주점")
  );
}

// ----------------------------- 컨트롤러 -----------------------------
/* GET /api/restaurants/nearby
 * - 사용자가 입력한 검색어(q)를 네이버 로컬 검색 API로 조회
 * - 결과 중 음식점/카페/주점 계열만 필터링
 * - 중복된 결과 제거 (이름+주소 기준)
 * - DB에 멱등 등록(ensureRestaurant) 후, 식당 점수(getRestaurantScore)까지 붙여서 반환
 *
 * 응답 구조:
 * {
 *   resultType: "SUCCESS",
 *   error: null,
 *   success: {
 *     items: [
 *       {
 *         restaurantId: 1,
 *         name: "김밥천국",
 *         category: "한식",
 *         address: "서울시 …",
 *         telephone: "02-123-4567",
 *         mapx: 127.01,
 *         mapy: 37.12,
 *         link: "네이버 지도 링크",
 *         score: 4.3
 *       },
 *       ...
 *     ]
 *   }
 * }
 */
export const getNearbyRestaurantsCtrl = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "QUERY_REQUIRED" });

    // 1) 네이버 검색 실행
    const places = await searchLocal(q, 10);

    // 2) 음식점 계열만 필터링
    const filtered = places.filter((p) =>
      isRestaurantCategory(p?.category, p?.name),
    );

    // 3) 이름+주소 기준으로 중복 제거
    const uniq = [];
    const seen = new Set();
    for (const p of filtered) {
      const key = `${p.name}__${p.address}`;
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push(p);
    }

    // 4) DB 멱등 확보 및 점수 붙이기
    const items = [];
    for (const p of uniq) {
      const { restaurantId } = await ensureRestaurant({ place: p });
      const score = await getRestaurantScore(restaurantId);
      items.push({ restaurantId, ...p, score });
    }

    // 최종 응답
    return res.status(StatusCodes.OK).json({
      resultType: "SUCCESS",
      error: null,
      success: { items },
    });
  } catch (e) {
    next(e);
  }
};
