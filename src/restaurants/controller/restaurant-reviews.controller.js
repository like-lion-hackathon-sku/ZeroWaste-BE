// 위치: src / restaurants / controller / restaurant-reviews.controller.js
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../db.config.js";

/* 특정 식당 리뷰 목록 조회 컨트롤러
 *
 * 요청: GET /restaurants/:restaurantId/reviews
 *
 * 동작:
 * 1) restaurantId가 양의 정수인지 검증 (아니면 400 에러)
 * 2) 페이지네이션 적용 (page, size) → 기본값 page=1, size=10
 *    - size는 최대 50까지 허용
 * 3) 최신순(createdAt desc)으로 정렬
 * 4) 리뷰 작성자의 닉네임 포함해서 반환
 *
 * 응답 구조:
 * {
 *   resultType: "SUCCESS",
 *   error: null,
 *   success: {
 *     items: [
 *       {
 *         id: 1,
 *         restaurantId: 3,
 *         userId: 5,
 *         nickname: "홍길동",
 *         contents: "맛있어요",
 *         score: 5,
 *         createdAt: "2025-09-13T12:34:56.000Z"
 *       }
 *     ],
 *     page: 1,
 *     size: 10,
 *     totalCount: 42
 *   }
 * }
 *
 * 실패 케이스 예시:
 * {
 *   resultType: "FAILURE",
 *   error: "INVALID_RESTAURANT_ID",
 *   success: null
 * }
 */
export const handleGetRestaurantReviews = async (req, res, next) => {
  try {
    // 1) restaurantId 유효성 검사
    const restaurantId = Number(req.params.restaurantId);
    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      return res.status(400).json({
        resultType: "FAILURE",
        error: "INVALID_RESTAURANT_ID",
        success: null,
      });
    }

    // 2) 페이지네이션 파라미터 정규화
    const { page = "1", size = "10" } = req.query;
    const p = Math.max(1, Number(page) || 1);
    const s = Math.min(50, Math.max(1, Number(size) || 10));
    const skip = (p - 1) * s;

    // 3) 리뷰 총 개수 + 해당 페이지 리뷰 조회 (병렬 실행)
    const [totalCount, rows] = await Promise.all([
      prisma.reviews.count({ where: { restaurantsId: restaurantId } }),
      prisma.reviews.findMany({
        where: { restaurantsId: restaurantId },
        include: { user: { select: { nickname: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: s,
      }),
    ]);

    // 4) 응답용 데이터 변환 (필요한 필드만 추출)
    const items = rows.map((r) => ({
      id: r.id,
      restaurantId: r.restaurantsId,
      userId: r.userId,
      nickname: r.user?.nickname ?? null,
      contents: r.contents,
      score: r.score,
      createdAt: r.createdAt,
    }));

    // 5) 최종 응답
    return res.status(StatusCodes.OK).json({
      resultType: "SUCCESS",
      error: null,
      success: { items, page: p, size: s, totalCount },
    });
  } catch (err) {
    next(err);
  }
};
