import * as restRepo from "../repository/restaurants.repository.js";
import { getNaverMenusAndPhotos } from "./naver.service.js";

/* ===== 카테고리 매핑 유틸 ===== */
function toFoodCategoryEnum(input) {
  const s = String(input || "").toLowerCase();
  const pairs = [
    ["한식", "KOREAN"],
    ["korean", "KOREAN"],
    ["일식", "JAPANESE"],
    ["japanese", "JAPANESE"],
    ["중식", "CHINESE"],
    ["chinese", "CHINESE"],
    ["양식", "WESTERN"],
    ["이탈리아", "WESTERN"],
    ["western", "WESTERN"],
    ["분식", "FASTFOOD"],
    ["패스트푸드", "FASTFOOD"],
    ["fastfood", "FASTFOOD"],
    ["카페", "CAFE"],
    ["cafe", "CAFE"],
    ["커피", "CAFE"],
  ];
  for (const [kw, code] of pairs) if (s.includes(kw)) return code;
  return "ETC";
}

/* ===== 입력 정규화 ===== */
function normalizeTel(t = "") {
  const digits = String(t).replace(/\D+/g, ""); // 숫자만
  return digits.length >= 7 ? digits : ""; // 7자리 미만이면 무시
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

  // 2) 이름+주소(대소문자무시) 매칭
  const byNA = await restRepo.findByNameAddress(p.name, p.address);
  if (byNA) {
    // 전화번호가 새로 들어왔고 기존에 없었다면 보강하고 반환 (선택)
    if (p.telephone && !byNA.telephone) {
      // 보강은 서비스 단에서 하고 싶다면 update 함수 추가해서 처리 가능
      // 여기서는 간단히 매칭만
    }
    return { restaurantId: byNA.id, created: false };
  }

  // 3) 신규 생성 (telephone 빈문자 허용: Prisma 스키마상 required이기 때문)
  const created = await restRepo.create({ ...p, isSponsored: false });
  return { restaurantId: created.id, created: true };
}

/** 멱등 확보 엔드포인트용 래퍼 */
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

/** 외부 네이버 상세조회 — 메뉴/사진 */
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
    console.warn("[NAVER][EXTERNAL-FAIL]", e?.status || e?.message || e);
    ext = {};
  }

  return {
    restaurantId: base.id,
    name: base.name,
    address: base.address,
    telephone: ext?.telephone ?? base.telephone ?? "",
    category: ext?.category ?? base.category ?? "",
    menus: ext?.menus ?? [],
    photos: ext?.photos ?? [],
    placeId: ext?.placeId ?? null,
  };
}
