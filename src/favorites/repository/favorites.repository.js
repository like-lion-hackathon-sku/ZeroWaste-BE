// 위치: src / favorites / repository / favorites.repository.js
import { PrismaClient } from "../../generated/prisma/index.js";

const g = globalThis;
/* PrismaClient 싱글턴
 * - Prisma는 DB 연결을 여러 번 만들면 성능 문제가 생길 수 있음
 * - globalThis에 보관해서 재사용
 */
const prisma = g.__fwzmPrisma ?? new PrismaClient();
if (!g.__fwzmPrisma) g.__fwzmPrisma = prisma;

/* 즐겨찾기 추가 (멱등)
 * - (userId, restaurantsId) 조합이 이미 있으면 아무것도 안 함 → false 반환
 * - 없으면 새로 생성 → true 반환
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

/* 즐겨찾기 삭제 (멱등)
 * - 해당 userId + restaurantsId 레코드 모두 삭제
 * - 존재하지 않아도 에러 없이 통과
 */
export async function deleteFavorite(userId, restaurantsId) {
  await prisma.favorites.deleteMany({ where: { userId, restaurantsId } });
}

/* 내 즐겨찾기 목록 조회
 * - page/size 기반으로 페이징 처리
 * - restaurants 테이블과 join해서 식당 기본 정보도 포함
 * - size는 최소 1, 최대 50 제한
 *
 * 반환 구조:
 * {
 *   items: [
 *     { id, restaurantId, name, category, address, telephone, mapx, mapy },
 *     ...
 *   ],
 *   pageInfo: { page, size, total }
 * }
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
    restaurantId: r.restaurants?.id ?? null,
    name: r.restaurants?.name ?? null,
    category: r.restaurants?.category ?? null,
    address: r.restaurants?.address ?? null,
    telephone: r.restaurants?.telephone ?? null,
    mapx: r.restaurants?.mapx ?? null,
    mapy: r.restaurants?.mapy ?? null,
  }));

  return { items, pageInfo: { page: safePage, size: safeSize, total } };
}

/* 사용자 즐겨찾기 중 이름/주소로 검색
 * - 대소문자 구분 없이, trim 처리 후 비교
 * - 있으면 favoriteId와 restaurantId 반환
 * - 없으면 null
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

/* 사용자의 즐겨찾기를 다른 식당으로 재할당
 * - 만약 (userId, toId)가 이미 있으면 먼저 삭제
 * - 이후 (userId, fromId)를 모두 toId로 변경
 * - 실제 변경된 건수 반환
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

/* 특정 식당의 리뷰 목록 조회
 * - page/size, 정렬(sort), 별점(rating) 조건 지원
 * - sort="rating"이면 별점 높은 순, 기본은 최신순
 * - 결과에 리뷰 작성자(user) 정보 포함
 *
 * 반환 구조:
 * {
 *   items: [
 *     {
 *       id, restaurantId,
 *       user: { id, nickname, profileImage },
 *       rating, content, createdAt
 *     },
 *     ...
 *   ],
 *   pageInfo: { page, size, total }
 * }
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
