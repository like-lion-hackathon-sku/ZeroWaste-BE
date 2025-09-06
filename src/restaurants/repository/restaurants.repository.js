import { PrismaClient } from "../../generated/prisma/index.js";

/* PrismaClient 싱글턴 */
const g = globalThis;
const prisma = g.__fwzmPrisma ?? new PrismaClient();
if (!g.__fwzmPrisma) g.__fwzmPrisma = prisma;

/** id로 단건 조회 */
export async function findById(id) {
  return prisma.restaurants.findUnique({
    where: { id: Number(id) },
  });
}

/** (멱등 매칭) name + address 로 조회 */
export async function findByNameAddress(name, address) {
  if (!name || !address) return null;
  return prisma.restaurants.findFirst({
    where: { name, address },
  });
}

/** 신규 생성 (Prisma 모델 필드명 사용: isSponsored, createdAt/updatedAt은 자동) */
export async function create(data) {
  const payload = {
    name: String(data.name).slice(0, 50),
    category: data.category, // FoodCategory enum 값
    address: String(data.address),
    telephone: (data.telephone ?? "").slice(0, 15), // NOT NULL
    mapx: data.mapx ?? null,
    mapy: data.mapy ?? null,
    isSponsored: !!data.isSponsored, // <-- 중요: camelCase
  };
  return prisma.restaurants.create({ data: payload });
}

/** 상세조회용: 기본정보 + 통계(리뷰수/사진수/평균잔반/에코점수) */
export async function findDetailById(restaurantId) {
  const id = Number(restaurantId);

  // 기본 정보 (Prisma 필드명: isSponsored/createdAt/updatedAt)
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
      isSponsored: true, // <-- 수정
      createdAt: true, // <-- 수정
      updatedAt: true, // <-- 수정
    },
  });
  if (!base) return null;

  // 리뷰수, 사진수, 평균 잔반률
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
    avgLeftover == null ? null : Math.round((1 - avgLeftover) * 5 * 10) / 10; // 0~5

  return {
    ...base,
    stats: {
      reviews: reviewCount,
      photos: photoCount,
      avgLeftoverRatio: avgLeftover,
      ecoScore, // 높을수록 잔반 적음
    },
  };
}

/** 사용자의 즐겨찾기 여부 (상세페이지용) */
export async function isFavorite(userId, restaurantsId) {
  if (!userId) return false;
  const found = await prisma.favorites.findFirst({
    where: { userId: Number(userId), restaurantsId: Number(restaurantsId) },
    select: { id: true },
  });
  return !!found;
}
