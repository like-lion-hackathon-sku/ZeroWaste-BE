// 위치: src/restaurants/repository/restaurants.repository.js
import { PrismaClient } from "../../generated/prisma/index.js";

const g = globalThis;
/** @type {PrismaClient} - 프로세스 전역 Prisma 싱글턴 */
const prisma = g.__fwzmPrisma ?? new PrismaClient();
if (!g.__fwzmPrisma) g.__fwzmPrisma = prisma;

/**
 * 식당 단건 조회 (id 기준)
 *
 * @async
 * @param {number|string} id - 식당 ID
 * @returns {Promise<object|null>} 식당 레코드 (없으면 null)
 */
export async function findById(id) {
  return prisma.restaurants.findUnique({ where: { id: Number(id) } });
}

/**
 * (멱등 매칭) name + address 로 식당 조회
 *
 * @async
 * @param {string} name - 식당 이름
 * @param {string} address - 식당 주소
 * @returns {Promise<object|null>} 식당 레코드 (없으면 null)
 */
export async function findByNameAddress(name, address) {
  if (!name || !address) return null;
  return prisma.restaurants.findFirst({ where: { name, address } });
}

/**
 * 신규 식당 생성
 *
 * @async
 * @param {object} data
 * @param {string} data.name
 * @param {string} data.category
 * @param {string} data.address
 * @param {string=} data.telephone
 * @param {number|null=} data.mapx
 * @param {number|null=} data.mapy
 * @param {boolean=} data.isSponsored
 * @returns {Promise<object>} 생성된 식당 레코드
 */
export async function create(data) {
  const payload = {
    name: String(data.name).slice(0, 50),
    category: data.category,
    address: String(data.address),
    telephone: (data.telephone ?? "").slice(0, 15),
    mapx: data.mapx ?? null,
    mapy: data.mapy ?? null,
    isSponsored: !!data.isSponsored,
  };
  return prisma.restaurants.create({ data: payload });
}

/**
 * 식당 상세 조회: 기본정보 + 리뷰/사진 통계
 *
 * @async
 * @param {number|string} restaurantId - 식당 ID
 * @returns {Promise<object|null>} 상세 객체 (없으면 null)
 *
 * @example
 * {
 *   id: 1,
 *   name: "김밥천국",
 *   category: "KOREAN",
 *   address: "서울시 ...",
 *   ...
 *   stats: {
 *     reviews: 12,
 *     photos: 34,
 *     avgLeftoverRatio: 0.28,
 *     ecoScore: 3.6
 *   }
 * }
 */
export async function findDetailById(restaurantId) {
  const id = Number(restaurantId);
  const base = await prisma.restaurants.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      category: true,
      address: true,
      telephone: true,
      mapx: true,
      mapy: true,
      isSponsored: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!base) return null;

  const [reviewAgg, photoAgg, avgAgg] = await Promise.all([
    prisma.reviews.aggregate({
      _count: { _all: true },
      where: { restaurantsId: id },
    }),
    prisma.reviewPhotos.aggregate({
      _count: { _all: true },
      where: { reviews: { restaurantsId: id } },
    }),
    prisma.reviewPhotos.aggregate({
      _avg: { leftoverRatio: true },
      where: { reviews: { restaurantsId: id } },
    }),
  ]);

  const reviewCount = reviewAgg?._count?._all ?? 0;
  const photoCount = photoAgg?._count?._all ?? 0;
  const avgLeftover = avgAgg?._avg?.leftoverRatio ?? null;
  const ecoScore =
    avgLeftover == null ? null : Math.round((1 - avgLeftover) * 5 * 10) / 10;

  return {
    ...base,
    stats: {
      reviews: reviewCount,
      photos: photoCount,
      avgLeftoverRatio: avgLeftover,
      ecoScore,
    },
  };
}

/**
 * 특정 사용자가 해당 식당을 즐겨찾기 했는지 여부
 *
 * @async
 * @param {number|string|null|undefined} userId - 사용자 ID
 * @param {number|string} restaurantsId - 식당 ID
 * @returns {Promise<boolean>} true=즐겨찾기 있음, false=없음
 */
export async function isFavorite(userId, restaurantsId) {
  if (!userId) return false;
  const found = await prisma.favorites.findFirst({
    where: { userId: Number(userId), restaurantsId: Number(restaurantsId) },
    select: { id: true },
  });
  return !!found;
}
