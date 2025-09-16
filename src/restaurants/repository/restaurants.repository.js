// 위치: src / restaurants / repository / restaurants.repository.js
// 제작자: 김민호
// 최종 수정일: 2025 09 16 21:48
import { PrismaClient } from "../../generated/prisma/index.js";

const g = globalThis;
/* PrismaClient 싱글턴
 * - Prisma는 DB 연결을 여러 번 만들면 성능 문제가 생길 수 있음
 * - 그래서 globalThis에 보관하고, 이미 있으면 재사용
 */
const prisma = g.__fwzmPrisma ?? new PrismaClient();
if (!g.__fwzmPrisma) g.__fwzmPrisma = prisma;

/* 식당 단건 조회 (id 기준)
 * - restaurants 테이블에서 id로 단일 레코드 조회
 * - 해당 id가 없으면 null 반환
 */
export async function findById(id) {
  return prisma.restaurants.findUnique({ where: { id: Number(id) } });
}

/* 식당 조회 (멱등 매칭: name + address)
 * - 같은 이름과 주소가 있는 식당을 찾음
 * - name이나 address가 없으면 null 반환
 */
export async function findByNameAddress(name, address) {
  if (!name || !address) return null;
  return prisma.restaurants.findFirst({ where: { name, address } });
}

/* 신규 식당 생성
 * - 전달된 데이터로 restaurants 테이블에 새 레코드 추가
 * - 문자열은 길이 제한을 걸고, 좌표 값이 없으면 null 처리
 * - isSponsored 값은 boolean으로 변환
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

/* 식당 상세 조회
 * - 기본 정보 (name, category, address 등)
 * - 리뷰 개수, 사진 개수, 평균 잔반률, 친환경 점수(ecoScore)까지 포함
 * - 잔반률이 없으면 ecoScore는 null 반환
 *
 * 반환 예시:
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

  // 기본 식당 정보
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

  // 리뷰 개수, 사진 개수, 평균 잔반률 동시에 조회
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

  // ecoScore = (1 - 평균 잔반률) * 5 (소수점 한 자리)
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

/* 즐겨찾기 여부 확인
 * - 특정 사용자(userId)가 특정 식당(restaurantsId)을 즐겨찾기 했는지 검사
 * - favorites 테이블에 존재하면 true, 없으면 false 반환
 * - userId가 없으면 false 바로 반환
 */
export async function isFavorite(userId, restaurantsId) {
  if (!userId) return false;
  const found = await prisma.favorites.findFirst({
    where: { userId: Number(userId), restaurantsId: Number(restaurantsId) },
    select: { id: true },
  });
  return !!found;
}
