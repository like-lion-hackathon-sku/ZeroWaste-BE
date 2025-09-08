import { PrismaClient } from "../../generated/prisma/index.js";

const g = globalThis;
const prisma = g.__fwzmPrisma ?? new PrismaClient();
if (!g.__fwzmPrisma) g.__fwzmPrisma = prisma;

/** id로 단건 조회 */
export async function findById(id) {
  return prisma.restaurants.findUnique({ where: { id: Number(id) } });
}

/** 전화번호로 1순위 매칭 */
export async function findByTelephone(telephone) {
  if (!telephone) return null;
  return prisma.restaurants.findFirst({
    where: { telephone },
    select: { id: true, name: true, address: true, telephone: true },
  });
}

/** (멱등 매칭) name + address (대소문자 무시 & trim) */
export async function findByNameAddress(name, address) {
  const nm = String(name ?? "").trim();
  const addr = String(address ?? "").trim();
  if (!nm || !addr) return null;

  return prisma.restaurants.findFirst({
    where: {
      AND: [
        { name: { equals: nm, mode: "insensitive" } },
        { address: { equals: addr, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, address: true, telephone: true },
  });
}

/** 신규 생성 */
export async function create(data) {
  const payload = {
    name: String(data.name).slice(0, 50),
    category: data.category, // enum
    address: String(data.address),
    telephone: String(data.telephone ?? "").slice(0, 15), // 스키마상 required이므로 빈문자 허용
    mapx: data.mapx ?? null,
    mapy: data.mapy ?? null,
    isSponsored: !!data.isSponsored,
  };
  return prisma.restaurants.create({ data: payload });
}

/** 상세조회: 기본정보 + 통계 */
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

/** 사용자의 즐겨찾기 여부 */
export async function isFavorite(userId, restaurantsId) {
  if (!userId) return false;
  const found = await prisma.favorites.findFirst({
    where: { userId: Number(userId), restaurantsId: Number(restaurantsId) },
    select: { id: true },
  });
  return !!found;
}
export async function findRecentReviewsWithPhotos(
  restaurantId,
  { page = 1, size = 10 } = {},
) {
  const id = Number(restaurantId);
  const safePage = Number.isFinite(+page) && +page > 0 ? +page : 1;
  const safeSizeRaw = Number.isFinite(+size) && +size > 0 ? +size : 10;
  const take = Math.min(Math.max(safeSizeRaw, 1), 30);
  const skip = (safePage - 1) * take;

  const [total, rows] = await Promise.all([
    prisma.reviews.count({ where: { restaurantsId: id } }),
    prisma.reviews.findMany({
      where: { restaurantsId: id },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        reviewPhotos: {
          select: {
            id: true,
            imageName: true,
            leftoverRatio: true,
            createdAt: true,
          },
          orderBy: { id: "desc" },
        },
        user: { select: { id: true, nickname: true, profile: true } },
      },
    }),
  ]);

  const items = rows.map((r) => ({
    reviewId: r.id,
    createdAt: r.createdAt,
    user: {
      id: r.user?.id,
      nickname: r.user?.nickname,
      profile: r.user?.profile,
    },
    photos:
      r.reviewPhotos?.map((p) => ({
        id: p.id,
        imageName: p.imageName,
        leftoverRatio: p.leftoverRatio,
        createdAt: p.createdAt,
      })) ?? [],
  }));

  return { items, pageInfo: { page: safePage, size: take, total } };
}

/** 갤러리(사진) 모아보기 – 사진만 평면으로 페이징 */
export async function findGalleryPhotos(
  restaurantId,
  { page = 1, size = 12 } = {},
) {
  const id = Number(restaurantId);
  const safePage = Number.isFinite(+page) && +page > 0 ? +page : 1;
  const safeSizeRaw = Number.isFinite(+size) && +size > 0 ? +size : 12;
  const take = Math.min(Math.max(safeSizeRaw, 1), 60);
  const skip = (safePage - 1) * take;

  const [total, rows] = await Promise.all([
    prisma.reviewPhotos.count({ where: { reviews: { restaurantsId: id } } }),
    prisma.reviewPhotos.findMany({
      where: { reviews: { restaurantsId: id } },
      orderBy: { id: "desc" },
      skip,
      take,
      select: {
        id: true,
        imageName: true,
        leftoverRatio: true,
        createdAt: true,
        reviewId: true,
      },
    }),
  ]);

  const items = rows.map((p) => ({
    id: p.id,
    imageName: p.imageName,
    leftoverRatio: p.leftoverRatio,
    createdAt: p.createdAt,
    reviewId: p.reviewId,
  }));

  return { items, pageInfo: { page: safePage, size: take, total } };
}
