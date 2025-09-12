// 위치: src / favorites / repository / favorites.repository.js
import { PrismaClient } from "../../generated/prisma/index.js";

const g = globalThis;
const prisma = g.__fwzmPrisma ?? new PrismaClient();
if (!g.__fwzmPrisma) g.__fwzmPrisma = prisma;

/**
 * 멱등 추가: (userId, restaurantsId) 중복 방지
 * @returns {Promise<boolean>} created 여부
 */
export async function ensureFavorite(userId, restaurantsId) {
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
  }));

  const pageInfo = { page: safePage, size: safeSize, total };
  return { items, pageInfo };
}

/* ==================== 🔽 추가된 유틸/함수들 🔽 ==================== */

/** 사용자 즐겨찾기 중 이름/주소가 일치하는 항목을 찾기(대소문자 무시, 양쪽 trim) */
export async function findUserFavoriteByNameAddress(userId, name, address) {
  const nm = String(name ?? "").trim();
  const addr = String(address ?? "").trim();
  if (!nm || !addr) return null;

  const row = await prisma.favorites.findFirst({
    where: {
      userId,
      restaurants: {
        name: { equals: nm, mode: "insensitive" },
        address: { equals: addr, mode: "insensitive" },
      },
    },
    include: { restaurants: { select: { id: true } } },
  });
  if (!row) return null;
  return {
    favoriteId: row.id,
    restaurantId: row.restaurants?.id ?? null,
  };
}

/**
 * 사용자의 즐겨찾기를 다른 restaurant로 재할당
 * - (userId, toId) 가 이미 있으면 중복 방지를 위해 먼저 삭제
 * - 그 뒤 (userId, fromId) → toId 로 updateMany
 * @returns {Promise<number>} 재할당 건수
 */
export async function reassignFavoritesForUser(userId, fromId, toId) {
  if (!userId || !fromId || !toId || fromId === toId) return 0;

  await prisma.favorites.deleteMany({
    where: { userId, restaurantsId: toId },
  });

  const res = await prisma.favorites.updateMany({
    where: { userId, restaurantsId: fromId },
    data: { restaurantsId: toId },
  });

  return res.count || 0;
}
export async function findReviewsByRestaurant(
  restaurantId,
  { page, size, sort, rating },
  ctx = {},
) {
  const where = {
    restaurantsId: restaurantId,
    ...(rating ? { rating } : {}),
  };

  const orderBy =
    sort === "rating"
      ? [{ rating: "desc" }, { id: "desc" }]
      : [{ createdAt: "desc" }, { id: "desc" }];

  const skip = (page - 1) * size;
  const take = size;

  const [total, rows] = await Promise.all([
    prisma.reviews.count({ where }),
    prisma.reviews.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        users: { select: { id: true, nickname: true, profileImage: true } },
      },
    }),
  ]);

  const items = rows.map((r) => ({
    id: r.id,
    restaurantId: restaurantId,
    user: {
      id: r.users?.id ?? null,
      nickname: r.users?.nickname ?? null,
      profileImage: r.users?.profileImage ?? null,
    },
    rating: r.rating,
    content: r.content,
    createdAt:
      r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  }));

  return { items, pageInfo: { page, size, total } };
}
