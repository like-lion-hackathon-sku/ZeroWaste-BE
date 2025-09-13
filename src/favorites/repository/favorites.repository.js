// 위치: src/favorites/repository/favorites.repository.js
import { PrismaClient } from "../../generated/prisma/index.js";

const g = globalThis;
/** @type {PrismaClient} - 프로세스 단위 Prisma 싱글턴 */
const prisma = g.__fwzmPrisma ?? new PrismaClient();
if (!g.__fwzmPrisma) g.__fwzmPrisma = prisma;

/**
 * @typedef {Object} PageInfo
 * @property {number} page  - 현재 페이지(1-base)
 * @property {number} size  - 페이지 크기
 * @property {number} total - 전체 개수
 */

/**
 * @typedef {Object} FavoriteItem
 * @property {number} id
 * @property {number|null} restaurantId
 * @property {string|null} name
 * @property {string|null} category
 * @property {string|null} address
 * @property {string|null} telephone
 * @property {number|null} mapx
 * @property {number|null} mapy
 */

/**
 * @typedef {Object} FavoriteList
 * @property {FavoriteItem[]} items
 * @property {PageInfo} pageInfo
 */

/**
 * 멱등 추가: (userId, restaurantsId) 중복 방지
 * - 이미 존재하면 아무것도 하지 않고 false 반환
 * - 없으면 생성 후 true 반환
 *
 * @async
 * @param {number} userId
 * @param {number} restaurantsId
 * @returns {Promise<boolean>} created 여부
 */
export async function ensureFavorite(userId, restaurantsId) {
  const found = await prisma.favorites.findFirst({
    where: { userId, restaurantsId },
    select: { id: true },
  });
  if (found) return false;

  await prisma.favorites.create({ data: { userId, restaurantsId } });
  return true;
}

/**
 * 멱등 삭제: 존재해도/안 해도 안전하게 삭제 시도
 *
 * @async
 * @param {number} userId
 * @param {number} restaurantsId
 * @returns {Promise<void>}
 */
export async function deleteFavorite(userId, restaurantsId) {
  await prisma.favorites.deleteMany({ where: { userId, restaurantsId } });
}

/**
 * 내 즐겨찾기 목록 (page/size 기반)
 *
 * @async
 * @param {number} userId
 * @param {{page?:number, size?:number}} [opts]
 * @returns {Promise<FavoriteList>}
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

  /** @type {FavoriteItem[]} */
  const items = rows.map((r) => ({
    id: r.id,
    restaurantId: r.restaurants?.id ?? null,
    name: r.restaurants?.name ?? null,
    category: r.restaurants?.category ?? null,
    address: r.restaurants?.address ?? null,
    telephone: r.restaurants?.telephone ?? null,
    mapx: r.restaurants?.mapx ?? null,
    mapy: r.restaurants?.mapy ?? null,
  }));

  /** @type {PageInfo} */
  const pageInfo = { page: safePage, size: safeSize, total };
  return { items, pageInfo };
}

/* ==================== 🔽 추가된 유틸/함수들 🔽 ==================== */

/**
 * 사용자 즐겨찾기 중 이름/주소가 일치하는 항목을 찾기
 * - 대소문자 무시, 양쪽 trim
 *
 * @async
 * @param {number} userId
 * @param {string} name
 * @param {string} address
 * @returns {Promise<{favoriteId:number, restaurantId:number|null} | null>}
 */
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
 * - (userId, toId) 이미 존재 시 중복 방지를 위해 먼저 삭제
 * - 이후 (userId, fromId) → toId 로 updateMany
 *
 * @async
 * @param {number} userId
 * @param {number} fromId
 * @param {number} toId
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

/**
 * 특정 식당의 리뷰 목록
 *
 * @async
 * @param {number} restaurantId
 * @param {{page:number, size:number, sort?:"rating"|"recent", rating?:number}} opts
 * @param {object} [ctx={}] - 트랜잭션/요청 컨텍스트 등 (미사용 시 빈 객체)
 * @returns {Promise<{ items: Array<{
 *   id:number,
 *   restaurantId:number,
 *   user:{ id:number|null, nickname:string|null, profileImage:string|null },
 *   rating:number,
 *   content:string,
 *   createdAt:string
 * }>, pageInfo:PageInfo }>}
 */
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
    restaurantId,
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
