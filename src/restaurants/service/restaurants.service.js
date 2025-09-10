import pkg from "../../generated/prisma/index.js";
const { PrismaClient } = pkg;

const prisma = new PrismaClient(); // ✅ 여기서 인스턴스 생성

import { toFoodCategory } from "./category.mapper.js";

/**
 * 네이버 place 객체를 멱등 저장하고 ID/기본정보를 반환
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

  // 1) name+address로 우선 탐색
  let found = await prisma.restaurant.findFirst({
    where: { name, address },
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

  const categoryEnum = toFoodCategory(rawCat, name);

  if (found) {
    const updated = await prisma.restaurant.update({
      where: { id: found.id },
      data: {
        name,
        address,
        telephone,
        mapx,
        mapy,
        category: categoryEnum,
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
      category: categoryEnum,
    },
  });

  return { restaurantId: created.id, restaurant: created };
}

export async function getRestaurantDetail(restaurantId) {
  return prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: {
      // 필요하다면 관계 테이블도 join
      // reviews: true,
      // menus: true,
    },
  });
}
