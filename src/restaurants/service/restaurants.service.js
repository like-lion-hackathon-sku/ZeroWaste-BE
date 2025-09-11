import * as restRepo from "../repository/restaurants.repository.js";

/** 카테고리 문자열 → ENUM 매핑 */
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
  for (const [kw, code] of pairs) if (s.includes(kw)) return code;
  return "ETC";
}

/** 외부 place payload 정규화 */
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

/** 외부 장소 동기화(멱등) */
export async function syncExternalPlace(placePayload) {
  const p = normalizePlacePayload(placePayload);
  const byNA = await restRepo.findByNameAddress(p.name, p.address);
  if (byNA) return { restaurantId: byNA.id, created: false };
  const created = await restRepo.create({ ...p, isSponsored: false });
  return { restaurantId: created.id, created: true };
}

/** 식당 보장: id 또는 외부 place 로 생성/찾기 */
export async function ensureRestaurant({ place }) {
  const category = toFoodCategory(place.category, place.name);

  const restaurant = await prisma.restaurant.upsert({
    where: {
      // 전화번호+좌표 조합으로 유니크 판단한다고 가정
      unique_key: {
        telephone: place.telephone ?? "",
        mapx: place.mapx,
        mapy: place.mapy,
      },
    },
    update: {
      name: place.name,
      address: place.address,
      category, // ✅ 매핑된 enum 저장
    },
    create: {
      name: place.name,
      address: place.address,
      telephone: place.telephone,
      category, // ✅ 매핑된 enum 저장
      mapx: place.mapx,
      mapy: place.mapy,
    },
  });

  return restaurant;
}

/** DB 상세 + 즐겨찾기 여부 */
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
