// 위치: src/restaurtants/service/score.service.js
import { PrismaClient } from "../../generated/prisma/index.js";

const g = globalThis;
const prisma = g.__fwzmPrisma ?? new PrismaClient();
if (!g.__fwzmPrisma) g.__fwzmPrisma = prisma;

/**
 * 식당 점수 계산 (잔반 비율 기반 ecoScore)
 * @param {number} restaurantId
 */
export async function getRestaurantScore(restaurantId) {
  const agg = await prisma.reviewPhotos.aggregate({
    _avg: { leftoverRatio: true },
    where: { reviews: { restaurantsId: restaurantId } },
  });
  const avgLeftover = agg._avg?.leftoverRatio ?? null;
  if (avgLeftover == null) return null;
  return Math.round((1 - avgLeftover) * 5 * 10) / 10; // 0~5 점, 소수1자리
}
