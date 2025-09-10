import { prisma } from "../../generated/prisma/index.js";
import { toFoodCategory } from "./category.mapper.js";

/**
 * 네이버 place 객체를 멱등 저장하고 ID/기본정보를 반환
 * - 중복 기준: (name + address) 우선 → 없으면 (telephone + 좌표) 보조
 * - 저장 시 FoodCategory 매핑을 적용
 */
export async function ensureRestaurant({ place }) {
  const {
    name = "",
    address = "",
    telephone = null,
    category: rawCat = "",
    mapx = null,
    mapy = null,
  } = place ?? {};

  // 1) 우선 동일 name+address 검색
  let found = await prisma.restaurant.findFirst({
    where: {
      name,
      address,
    },
  });

  // 2) 없으면 전화/좌표로 보조 탐색
  if (!found && (telephone || (mapx && mapy))) {
    found = await prisma.restaurant.findFirst({
      where: {
        OR: [
          telephone ? { telephone } : undefined,
          mapx && mapy ? { AND: [{ mapx }, { mapy }] } : undefined,
        ].filter(Boolean),
      },
    });
  }

  const categoryEnum = toFoodCategory(rawCat, name); // ✅ enum 문자열 계산

  if (found) {
    // 업데이트(이름/주소 변동, 카테고리 갱신 등)
    const updated = await prisma.restaurant.update({
      where: { id: found.id },
      data: {
        name,
        address,
        telephone,
        mapx,
        mapy,
        category: categoryEnum, // ✅ DB enum 저장
        updatedAt: new Date(),
      },
    });
    return { restaurantId: updated.id, restaurant: updated };
  }

  // 신규 생성
  const created = await prisma.restaurant.create({
    data: {
      name,
      address,
      telephone,
      mapx,
      mapy,
      category: categoryEnum, // ✅ DB enum 저장
    },
  });

  return { restaurantId: created.id, restaurant: created };
}
