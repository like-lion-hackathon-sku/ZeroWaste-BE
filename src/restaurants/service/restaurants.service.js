// 위치: src/restaurants/service/restaurants.service.js
import * as restRepo from "../repository/restaurants.repository.js";
import { getNaverMenusAndPhotos } from "./naver.service.js";

/** 외부 네이버 상세조회 */
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

function toFoodCategoryEnum(input) {
  if (!input) return "ETC";
  const s = String(input).toLowerCase().trim();
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
  return map[s] ?? "ETC";
}

function normalizePlacePayload(place = {}) {
  const { name, address, category, telephone, mapx, mapy } = place;
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

export async function syncExternalPlace(placePayload) {
  const p = normalizePlacePayload(placePayload);
  const byNA = await restRepo.findByNameAddress(p.name, p.address);
  if (byNA) return { restaurantId: byNA.id, created: false };
  const created = await restRepo.create({ ...p, isSponsored: false });
  return { restaurantId: created.id, created: true };
}

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

/** 외부 네이버 상세조회 */
export async function getRestaurantExternalDetail(restaurantId) {
  const base = await restRepo.findById(restaurantId);
  if (!base) {
    const err = new Error("RESTAURANT_NOT_FOUND");
    err.status = 404;
    throw err;
  }
  const ext = await getNaverMenusAndPhotos({
    name: base.name,
    address: base.address,
  });
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
