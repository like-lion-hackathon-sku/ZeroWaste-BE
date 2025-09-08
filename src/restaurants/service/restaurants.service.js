// 위치: src/restaurants/service/restaurants.service.js
import * as restRepo from "../repository/restaurants.repository.js";
import { getNaverMenusAndPhotos } from "./naver.service.js";

/** 카테고리 문자열 → ENUM 매핑 */
function toFoodCategoryEnum(input) {
  const s = String(input || "").toLowerCase();
  const pairs = [
    // 메인
    ["한식", "KOREAN"],
    ["korean", "KOREAN"],
    ["일식", "JAPANESE"],
    ["japanese", "JAPANESE"],
    ["중식", "CHINESE"],
    ["chinese", "CHINESE"],
    ["양식", "WESTERN"],
    ["western", "WESTERN"],
    ["이탈리아", "WESTERN"],
    // 패스트/분식/카페
    ["분식", "FASTFOOD"],
    ["패스트푸드", "FASTFOOD"],
    ["fastfood", "FASTFOOD"],
    ["버거", "FASTFOOD"],
    ["치킨", "FASTFOOD"],
    ["피자", "WESTERN"],
    ["카페", "CAFE"],
    ["cafe", "CAFE"],
    ["커피", "CAFE"],
    // 서브 카테고리 보강
    ["이자카야", "JAPANESE"],
    ["초밥", "JAPANESE"],
    ["스시", "JAPANESE"],
  ];
  for (const [kw, code] of pairs) if (s.includes(kw)) return code;
  return "ETC";
}

/* ===== 입력 정규화 ===== */
function normalizeTel(t = "") {
  // 숫자만 남기고 7자리 미만이면 무시 (무의미한 값으로 간주)
  const digits = String(t).replace(/\D+/g, "");
  return digits.length >= 7 ? digits : "";
}

function normalizePlacePayload(place = {}) {
  const name = String(place.name ?? "").trim();
  const address = String(place.address ?? "").trim();
  if (!name || !address) {
    const err = new Error("INVALID_PLACE_PAYLOAD");
    err.status = 400;
    throw err;
  }
  return {
    name,
    address,
    category: toFoodCategoryEnum(place.category),
    telephone: normalizeTel(place.telephone ?? ""),
    mapx: place.mapx == null ? null : Number(place.mapx),
    mapy: place.mapy == null ? null : Number(place.mapy),
  };
}

/* ===== 외부 place → 내부 식당 동기화(멱등) =====
   1) 전화번호(정규화된)가 있으면 전화번호로 매칭
   2) 없거나 실패하면 이름+주소(대소문자 무시, trim)로 매칭
   3) 둘 다 없으면 신규 생성
*/
export async function syncExternalPlace(placePayload) {
  const p = normalizePlacePayload(placePayload);

  // 1) 전화번호 우선
  if (p.telephone) {
    const byTel = await restRepo.findByTelephone(p.telephone);
    if (byTel) return { restaurantId: byTel.id, created: false };
  }

  // 2) 이름+주소(대소문자 무시) 매칭
  const byNA = await restRepo.findByNameAddress(p.name, p.address);
  if (byNA) {
    // 전화번호가 새로 들어왔고 기존에 없었다면 보강 여지도 있으나 여기서는 매칭만.
    return { restaurantId: byNA.id, created: false };
  }

  // 3) 신규 생성 (telephone은 스키마상 required라 빈 문자열 저장 허용)
  const created = await restRepo.create({ ...p, isSponsored: false });
  return { restaurantId: created.id, created: true };
}

/** 식당 보장: id 또는 외부 place 로 생성/찾기 */
export async function ensureRestaurant({ restaurantId, place }) {
  if (restaurantId == null && !place) {
    const err = new Error("RESTAURANT_ID_OR_PLACE_REQUIRED");
    err.status = 400;
    throw err;
  }
  if (restaurantId != null) {
    const found = await restRepo.findById(restaurantId);
    if (found) return { restaurantId, created: false };
    if (!place) {
      const err = new Error("RESTAURANT_NOT_FOUND");
      err.status = 404;
      throw err;
    }
  }
  return await syncExternalPlace(place);
}

/** ✅ DB 상세조회 + 즐겨찾기 여부 */
export async function getRestaurantDetail(restaurantId, userId) {
  const detail = await restRepo.findDetailById(restaurantId);
  if (!detail) {
    const err = new Error("RESTAURANT_NOT_FOUND");
    err.status = 404;
    throw err;
  }
  const favorite = await restRepo.isFavorite(userId, restaurantId);
  return { ...detail, isFavorite: favorite };
}

/** 네이버 외부 상세(메뉴/사진/전화/카테고리) 조회 */
export async function getRestaurantExternalDetail(restaurantId) {
  const base = await restRepo.findById(restaurantId);
  if (!base) {
    const err = new Error("RESTAURANT_NOT_FOUND");
    err.status = 404;
    throw err;
  }

  let ext = null;
  try {
    ext = await getNaverMenusAndPhotos({
      name: base.name,
      address: base.address,
    });
  } catch (e) {
    // 운영 분석 편의 위해 컨텍스트 포함
    console.warn("[NAVER][EXTERNAL-FAIL]", {
      restaurantId,
      name: base.name,
      address: base.address,
      err: e?.status || e?.message || String(e),
    });
    ext = {};
  }

  return {
    restaurantId: base.id,
    name: base.name,
    address: base.address,
    telephone: String(ext?.telephone ?? base.telephone ?? "").trim(),
    category: toFoodCategoryEnum(ext?.category ?? base.category ?? ""),
    menus: Array.isArray(ext?.menus) ? ext.menus : [],
    photos: Array.isArray(ext?.photos) ? ext.photos : [],
    placeId: ext?.placeId ?? null,
  };
}
