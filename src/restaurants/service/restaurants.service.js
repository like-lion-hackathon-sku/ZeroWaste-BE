import * as restRepo from "../repository/restaurants.repository.js";

/** 문자열 카테고리를 Prisma enum(FoodCategory)로 매핑 */
function toFoodCategoryEnum(input) {
  if (!input) return "ETC";
  const s = String(input).toUpperCase().trim();
  if (
    [
      "KOREAN",
      "JAPANESE",
      "CHINESE",
      "WESTERN",
      "FASTFOOD",
      "CAFE",
      "ETC",
    ].includes(s)
  )
    return s;
  const map = {
    한식: "KOREAN",
    일식: "JAPANESE",
    중식: "CHINESE",
    양식: "WESTERN",
    분식: "FASTFOOD",
    패스트푸드: "FASTFOOD",
    카페: "CAFE",
    cafe: "CAFE",
    korean: "KOREAN",
    japanese: "JAPANESE",
    chinese: "CHINESE",
    western: "WESTERN",
    fastfood: "FASTFOOD",
  };
  return map[s.toLowerCase()] ?? "ETC";
}

/** 외부 place payload 정규화/검증 (스키마 제약에 맞춤) */
function normalizePlacePayload(place = {}) {
  const {
    name,
    address,
    category = null,
    telephone = "",
    mapx = null,
    mapy = null,
  } = place;
  if (!name || !address) {
    const err = new Error("INVALID_PLACE_PAYLOAD");
    err.status = 400;
    throw err;
  }
  return {
    name,
    address,
    category: toFoodCategoryEnum(category),
    telephone: (telephone ?? "").slice(0, 15),
    mapx: mapx == null ? null : Number(mapx),
    mapy: mapy == null ? null : Number(mapy),
  };
}

/** 외부 place → 내부 식당 멱등 동기화 (name+address 기준) */
export async function syncExternalPlace(placePayload) {
  const p = normalizePlacePayload(placePayload);
  const byNA = await restRepo.findByNameAddress(p.name, p.address);
  if (byNA) return { restaurantId: byNA.id, created: false };
  const created = await restRepo.create({
    ...p,
    isSponsored: false, // <-- 중요: camelCase로 넘김
  });
  return { restaurantId: created.id, created: true };
}

/** 식당 확보(멱등): id 유효하면 재사용, 아니면 place로 동기화 */
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
  const { restaurantId: syncedId, created } = await syncExternalPlace(place);
  return { restaurantId: syncedId, created: !!created };
}

/** 상세조회 */
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
