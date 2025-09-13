// 위치: src / restaurants / service /restaurants.service.js
import * as restRepo from "../repository/restaurants.repository.js";

/**
 * 카테고리 문자열 → ENUM 매핑
 *
 * @param {string} input
 * @returns {"KOREAN"|"JAPANESE"|"CHINESE"|"WESTERN"|"FASTFOOD"|"CAFE"|"ETC"}
 */
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
    ["western", "WESTERN"],
    ["이탈리아", "WESTERN"],
    ["분식", "FASTFOOD"],
    ["패스트푸드", "FASTFOOD"],
    ["fastfood", "FASTFOOD"],
    ["버거", "FASTFOOD"],
    ["치킨", "FASTFOOD"],
    ["피자", "WESTERN"],
    ["카페", "CAFE"],
    ["cafe", "CAFE"],
    ["커피", "CAFE"],
    ["이자카야", "JAPANESE"],
    ["초밥", "JAPANESE"],
    ["스시", "JAPANESE"],
  ];
  for (const [kw, code] of pairs)
    if (s.includes(kw)) return /** @type any */ (code);
  return "ETC";
}

/**
 * 외부 place payload 정규화
 *
 * @typedef {Object} NormalizedPlace
 * @property {string} name
 * @property {string} address
 * @property {"KOREAN"|"JAPANESE"|"CHINESE"|"WESTERN"|"FASTFOOD"|"CAFE"|"ETC"} category
 * @property {string} telephone
 * @property {number|null} mapx
 * @property {number|null} mapy
 *
 * @param {Object} [place={}]
 * @param {string} [place.name]
 * @param {string} [place.address]
 * @param {string} [place.category]
 * @param {string} [place.telephone]
 * @param {number|string} [place.mapx]
 * @param {number|string} [place.mapy]
 * @returns {NormalizedPlace}
 * @throws {Error & {status:number}} INVALID_PLACE_PAYLOAD(400) - name 또는 address 누락 시
 */
function normalizePlacePayload(place = {}) {
  const { name, address, category, telephone, mapx, mapy } = place;

  if (!name || !address) {
    const err = new Error("INVALID_PLACE_PAYLOAD");
    err.status = 400;
    throw err;
  }

  const toNumOrNull = (v) => {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  return {
    name: String(name).trim(),
    address: String(address).trim(),
    category: toFoodCategoryEnum(category),
    telephone: String(telephone ?? "")
      .trim()
      .slice(0, 15),
    mapx: toNumOrNull(mapx),
    mapy: toNumOrNull(mapy),
  };
}

/**
 * 외부 장소 동기화(멱등)
 * - 동일 (name, address)가 있으면 해당 레코드의 id 반환
 * - 없으면 생성 후 id 반환
 *
 * @async
 * @param {Object} placePayload - 외부 place 원본 payload
 * @returns {Promise<{ restaurantId:number, created:boolean }>}
 */
export async function syncExternalPlace(placePayload) {
  const p = normalizePlacePayload(placePayload);
  const byNA = await restRepo.findByNameAddress(p.name, p.address);
  if (byNA) return { restaurantId: byNA.id, created: false };
  const created = await restRepo.create({ ...p, isSponsored: false });
  return { restaurantId: created.id, created: true };
}

/**
 * 식당 보장: id 또는 외부 place 로 생성/찾기 (멱등)
 *
 * @async
 * @param {Object} params
 * @param {number=} params.restaurantId - 내부 식당 ID (선택)
 * @param {Object=} params.place - 외부 place payload (선택)
 * @returns {Promise<{ restaurantId:number, created:boolean }>}
 * @throws {Error & {status:number}} RESTAURANT_ID_OR_PLACE_REQUIRED(400)
 * @throws {Error & {status:number}} RESTAURANT_NOT_FOUND(404) - restaurantId가 유효하지 않고 place도 없을 때
 */
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

/**
 * 식당 상세 + 즐겨찾기 여부 반환
 *
 * @async
 * @param {number} restaurantId - 내부 식당 ID
 * @param {number|null|undefined} userId - 사용자 ID (null/undefined면 isFavorite은 false 또는 구현에 따름)
 * @returns {Promise<Object & { isFavorite:boolean }>}
 * @throws {Error & {status:number}} RESTAURANT_NOT_FOUND(404)
 */
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
