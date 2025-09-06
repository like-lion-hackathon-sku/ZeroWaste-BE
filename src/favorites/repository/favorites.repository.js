// 위치: src/favorites/repository/favorites.repository.js
import { PrismaClient } from "../../generated/prisma/index.js";

const g = globalThis;
const prisma = g.__fwzmPrisma ?? new PrismaClient();
if (!g.__fwzmPrisma) g.__fwzmPrisma = prisma;

/**
 * 멱등 추가: (userId, restaurantsId) 중복 방지
 * @returns {Promise<boolean>} created 여부
 */
export async function ensureFavorite(userId, restaurantsId) {
  // 스키마(Prisma) 필드명은 camelCase를 사용해야 합니다.
  const found = await prisma.favorites.findFirst({
    where: { userId, restaurantsId },
    select: { id: true },
  });
  if (found) return false;

  await prisma.favorites.create({
    data: { userId, restaurantsId },
  });
  return true;
}

/** 멱등 삭제 */
export async function deleteFavorite(userId, restaurantsId) {
  await prisma.favorites.deleteMany({
    where: { userId, restaurantsId },
  });
}

/**
 * 내 즐겨찾기 목록 (page/size 기반)
 * - page: 1부터 시작
 * - size: 1~50 안전 가드
 */
export async function findByUser(userId, { page = 1, size = 20 } = {}) {
  const safePage = Number.isFinite(+page) && +page > 0 ? +page : 1;
  const safeSizeRaw = Number.isFinite(+size) && +size > 0 ? +size : 20;
  const safeSize = Math.min(Math.max(safeSizeRaw, 1), 50);
  const skip = (safePage - 1) * safeSize;
  const take = safeSize;

  const where = { userId };

  const [total, rows] = await Promise.all([
    prisma.favorites.count({ where }),
    prisma.favorites.findMany({
      where,
      include: {
        // 관계 이름은 스키마 그대로: Favorites.restaurants -> Restaurants
        restaurants: {
          select: {
            id: true,
            name: true,
            category: true,
            address: true,
            telephone: true,
            mapx: true,
            mapy: true,
          },
        },
      },
      orderBy: [{ id: "desc" }],
      skip,
      take,
    }),
  ]);

  const items = rows.map((r) => ({
    id: r.id,
    restaurantId: r.restaurants?.id,
    name: r.restaurants?.name,
    category: r.restaurants?.category,
    address: r.restaurants?.address,
    telephone: r.restaurants?.telephone,
    mapx: r.restaurants?.mapx,
    mapy: r.restaurants?.mapy,
    // Favorites 모델엔 createdAt이 없으므로 제외
  }));

  const pageInfo = {
    page: safePage,
    size: safeSize,
    total,
  };

  return { items, pageInfo };
}
