// src/restaurants/controller/restaurant-reviews.controller.js
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../db.config.js";

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
