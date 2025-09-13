// 위치: src / restaurants / service / score.service.js
import { PrismaClient } from "../../generated/prisma/index.js";

const g = globalThis;
/** @type {PrismaClient} - 프로세스 전역 Prisma 싱글턴 */
const prisma = g.__fwzmPrisma ?? new PrismaClient();
if (!g.__fwzmPrisma) g.__fwzmPrisma = prisma;

/**
 * 식당 점수 계산 서비스
 *
 * - 기준: reviewPhotos 테이블의 leftoverRatio(잔반 비율) 평균값
 * - 계산식: `ecoScore = (1 - avgLeftover) * 5`
 *   - leftoverRatio = 0 → ecoScore = 5.0 (최고점)
 *   - leftoverRatio = 1 → ecoScore = 0.0 (최저점)
 * - 소수점 첫째 자리까지 반올림
 *
 * @async
 * @param {number} restaurantId - 식당 ID
 * @returns {Promise<number|null>} 0~5 범위 ecoScore (소수점 1자리), 데이터 없으면 null
 *
 * @example
 * const score = await getRestaurantScore(3);
 * // e.g. 4.2
 */
export async function getRestaurantScore(restaurantId) {
  const agg = await prisma.reviewPhotos.aggregate({
    _avg: { leftoverRatio: true },
    where: { reviews: { restaurantsId: restaurantId } },
  });

  const avgLeftover = agg._avg?.leftoverRatio ?? null;
  if (avgLeftover == null) return null;

  return Math.round((1 - avgLeftover) * 5 * 10) / 10; // 0~5 점, 소수 1자리
}
