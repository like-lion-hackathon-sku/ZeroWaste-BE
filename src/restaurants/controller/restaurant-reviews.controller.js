// 위치: src / restaurants / controller / restaurant-reviews.controller.js
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../db.config.js";

/**
 * GET /restaurants/:restaurantId/reviews
 *
 * 특정 식당의 리뷰 목록 조회 컨트롤러
 *
 * - restaurantId 유효성 검사 (양의 정수)
 * - 페이지네이션(page, size) 적용
 * - 최신순(createdAt desc) 정렬
 * - 사용자 닉네임 포함 반환
 *
 * @async
 * @function handleGetRestaurantReviews
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 *
 * @param {string} req.params.restaurantId - 식당 ID (필수, 양의 정수)
 * @param {string|number} [req.query.page=1] - 페이지 번호
 * @param {string|number} [req.query.size=10] - 페이지 크기 (최대 50)
 *
 * @returns {Promise<void>}
 *
 * @example 성공 응답
 * {
 *   "resultType": "SUCCESS",
 *   "error": null,
 *   "success": {
 *     "items": [
 *       {
 *         "id": 1,
 *         "restaurantId": 3,
 *         "userId": 5,
 *         "nickname": "홍길동",
 *         "contents": "맛있어요",
 *         "score": 5,
 *         "createdAt": "2025-09-13T12:34:56.000Z"
 *       }
 *     ],
 *     "page": 1,
 *     "size": 10,
 *     "totalCount": 42
 *   }
 * }
 *
 * @example 실패 응답 (잘못된 restaurantId)
 * {
 *   "resultType": "FAILURE",
 *   "error": "INVALID_RESTAURANT_ID",
 *   "success": null
 * }
 */
export const handleGetRestaurantReviews = async (req, res, next) => {
  try {
    const restaurantId = Number(req.params.restaurantId);
    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      return res.status(400).json({
        resultType: "FAILURE",
        error: "INVALID_RESTAURANT_ID",
        success: null,
      });
    }

    const { page = "1", size = "10" } = req.query;
    const p = Math.max(1, Number(page) || 1);
    const s = Math.min(50, Math.max(1, Number(size) || 10));

    const skip = (p - 1) * s;

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

    const items = rows.map((r) => ({
      id: r.id,
      restaurantId: r.restaurantsId,
      userId: r.userId,
      nickname: r.user?.nickname ?? null,
      contents: r.contents,
      score: r.score,
      createdAt: r.createdAt,
    }));

    return res.status(StatusCodes.OK).json({
      resultType: "SUCCESS",
      error: null,
      success: { items, page: p, size: s, totalCount },
    });
  } catch (err) {
    next(err);
  }
};
