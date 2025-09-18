// 위치: src / restaurants / service / score.service.js
import { PrismaClient } from "../../generated/prisma/index.js";

const g = globalThis;
/* PrismaClient 싱글턴 생성
 * - Prisma는 DB 연결을 많이 생성하면 성능/메모리 문제가 생길 수 있음
 * - 따라서 globalThis에 보관해두고, 이미 있으면 재사용
 */
const prisma = g.__fwzmPrisma ?? new PrismaClient();
if (!g.__fwzmPrisma) g.__fwzmPrisma = prisma;

/* 특정 식당의 친환경 점수를 계산하는 서비스
 *
 * 점수 산정 기준:
 * - reviewPhotos 테이블의 leftoverRatio(잔반 비율) 평균값 사용
 * - 점수 계산식: (1 - avgLeftover) * 5
 *   예) 잔반 0.0 → 점수 5.0 (최고점)
 *       잔반 1.0 → 점수 0.0 (최저점)
 * - 계산 후 소수점 첫째 자리까지 반올림
 *
 * 반환값:
 * - 0.0 ~ 5.0 범위 점수 (소수점 한 자리)
 * - 리뷰 데이터가 없으면 null 반환
 */
export async function getRestaurantScore(restaurantId) {
  // 해당 식당의 잔반 비율 평균값 조회
  const agg = await prisma.reviewPhotos.aggregate({
    _avg: { leftoverRatio: true },
    where: { reviews: { restaurantsId: restaurantId } },
  });

  const avgLeftover = agg._avg?.leftoverRatio ?? null;
  if (avgLeftover == null) return null;

  // 점수 계산 후 소수점 첫째 자리까지 반올림
  return Math.round((1 - avgLeftover) * 5 * 10) / 10;
}
