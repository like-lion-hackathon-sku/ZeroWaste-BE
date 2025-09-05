// 위치: src/favorites/repository/favorites.repository.js
import { PrismaClient } from "../../generated/prisma/index.js";
const g = globalThis;
const prisma = g.__fwzmPrisma ?? new PrismaClient();
if (!g.__fwzmPrisma) g.__fwzmPrisma = prisma;

// 즐겨찾기 추가 레포지토리
export async function ensureFavorite(userId, restaurantId) {
  // (스키마 변경금지 전제) 유니크 인덱스가 없다면 수동 체크
  const found = await prisma.favorites.findFirst({
    where: { user_id: userId, restaurant_id: restaurantId },
    select: { id: true },
  });
  if (found) return false;

  await prisma.favorites.create({
    data: { user_id: userId, restaurant_id: restaurantId },
  });
  return true;
}

// 즐겨찾기 삭제 레포지토리 
export async function deleteFavorite(userId, restaurantId) {
  await prisma.favorites.deleteMany({
    where: { user_id: userId, restaurant_id: restaurantId },
  });
}

// 즐겨찾기 목록 조회 레포지토리
export async function findByUser(userId, { cursor = 0, limit = 20 } = {}) {
  const where = { user_id: userId };
  const total = await prisma.favorites.count({ where });
  const rows = await prisma.favorites.findMany({
    where,
    include: {
      restaurant: {  // Prisma relation 이름에 맞춰 변경 필요
        select: {
          id: true, name: true, category: true, address: true, telephone: true, mapx: true, mapy: true,
        }
      }
    },
    orderBy: [{ id: "desc" }],
    skip: cursor,
    take: Math.min(Math.max(+limit || 20, 1), 50),
  });

  const nextCursor = cursor + rows.length < total ? cursor + rows.length : null;
  const items = rows.map(r => ({
    id: r.id,
    restaurantId: r.restaurant?.id,
    name: r.restaurant?.name,
    category: r.restaurant?.category,
    address: r.restaurant?.address,
    telephone: r.restaurant?.telephone,
    mapx: r.restaurant?.mapx,
    mapy: r.restaurant?.mapy,
    created_at: r.created_at,
  }));
  return { items, nextCursor, total };
}