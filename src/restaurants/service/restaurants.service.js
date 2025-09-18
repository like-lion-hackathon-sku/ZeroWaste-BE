// 위치: src / restaurants / service / restaurants.service.js
import * as restRepo from "../repository/restaurants.repository.js";

/* 카테고리 문자열을 DB의 카테고리로 변환하는 함수
 * - 입력 문자열에 특정 키워드가 포함되어 있으면 대응되는 DB의 카테고리로 반환
 * - 매칭되지 않으면 ETC 반환
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

/* 외부 place payload를 내부 표준 형태로 변환하는 함수
 * - name, address 값이 반드시 있어야 함 (없으면 400 에러 발생)
 * - category는 ENUM으로 변환
 * - 전화번호는 최대 15자로 제한
 * - 좌표 값은 숫자로 변환, 변환 불가 시 null 처리
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

/* 외부 장소 정보를 DB와 동기화하는 함수 (멱등)
 * - 같은 (name, address) 식당이 있으면 해당 id 반환
 * - 없으면 새로 생성하고 id 반환
 */
export async function syncExternalPlace(placePayload) {
  const p = normalizePlacePayload(placePayload);
  const byNA = await restRepo.findByNameAddress(p.name, p.address);
  if (byNA) return { restaurantId: byNA.id, created: false };
  const created = await restRepo.create({ ...p, isSponsored: false });
  return { restaurantId: created.id, created: true };
}

/* 식당 보장 함수 (ensure)
 * - restaurantId 또는 place 중 하나를 받아서 식당을 확보
 * - restaurantId가 존재하면 그대로 반환
 * - restaurantId가 없거나 유효하지 않으면 place 기준으로 새로 등록
 * - 둘 다 없으면 400 에러 반환
 * - restaurantId가 잘못되었는데 place도 없으면 404 에러 반환
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

/* 식당 상세 정보를 조회하는 함수
 * - restaurantId로 DB에서 식당 상세를 조회
 * - userId가 주어지면 해당 사용자의 즐겨찾기 여부도 함께 반환
 * - 식당이 없으면 404 에러 발생
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
