import pkg from "../../generated/prisma/index.js";
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

import * as restRepo from "../repository/restaurants.repository.js";

/** 카테고리 문자열 → ENUM 매핑 */
function toFoodCategoryEnum(input, name = "") {
  const s = String(input || name || "").toLowerCase();
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
    category: toFoodCategoryEnum(category, name), // ✅ 여기서 enum 매핑
    telephone: String(telephone ?? "")
      .trim()
      .slice(0, 15),
    mapx: toNumOrNull(mapx),
    mapy: toNumOrNull(mapy),
  };
}

/** 외부 장소 동기화(멱등) */
export async function ensureRestaurant({ place }) {
  const category = toFoodCategoryEnum(place.category, place.name);

  // 1) name + address 기준으로 먼저 찾기
  let found = await prisma.restaurants.findFirst({
    where: {
      name: place.name,
      address: place.address,
    },
  });

  // 2) 못 찾으면 전화번호 + 좌표 기준으로 보조 검색
  if (!found && (place.telephone || (place.mapx && place.mapy))) {
    found = await prisma.restaurants.findFirst({
      where: {
        OR: [
          place.telephone ? { telephone: place.telephone } : undefined,
          place.mapx && place.mapy
            ? { AND: [{ mapx: place.mapx }, { mapy: place.mapy }] }
            : undefined,
        ].filter(Boolean),
      },
    });
  }

  if (found) {
    const updated = await prisma.restaurants.update({
      where: { id: found.id },
      data: {
        name: place.name,
        address: place.address,
        telephone: place.telephone,
        mapx: place.mapx,
        mapy: place.mapy,
        category,
      },
    });
    return { restaurantId: updated.id, restaurant: updated };
  }

  const created = await prisma.restaurants.create({
    data: {
      name: place.name,
      address: place.address,
      telephone: place.telephone,
      mapx: place.mapx,
      mapy: place.mapy,
      category,
    },
  });

  return { restaurantId: created.id, restaurant: created };
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
