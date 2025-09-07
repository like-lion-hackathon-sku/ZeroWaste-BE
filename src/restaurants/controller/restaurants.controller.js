// 위치: src/restaurants/controller/restaurants.controller.js
import { StatusCodes } from "http-status-codes";
import {
  ensureRestaurant,
  getRestaurantDetail,
  getRestaurantExternalDetail,
} from "../service/restaurants.service.js";

/** PUT /api/restaurants  (멱등 확보) */
export const ensureRestaurantCtrl = async (req, res, next) => {
  try {
    const { restaurantId, place } = req.body ?? {};
    const result = await ensureRestaurant({ restaurantId, place });

    if (typeof res.success === "function")
      return res.success(result, StatusCodes.OK);
    return res
      .status(StatusCodes.OK)
      .json({ resultType: "SUCCESS", error: null, success: result });
  } catch (e) {
    next(e);
  }
};

/** GET /api/restaurants/:restaurantId/detail (DB + 네이버 통합 상세조회) */
export const getRestaurantFullDetailCtrl = async (req, res, next) => {
  try {
    const restaurantId = Number(req.params.restaurantId);
    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    const userId = req.user?.id ?? null;

    // 1. DB 상세 조회
    const dbDetail = await getRestaurantDetail(restaurantId, userId);

    // 2. 네이버 외부 상세 조회
    const external = await getRestaurantExternalDetail(restaurantId);

    // 3. 합쳐서 반환
    return res.status(StatusCodes.OK).json({
      resultType: "SUCCESS",
      error: null,
      success: {
        ...dbDetail,
        external, // 네이버 메뉴/사진 포함
      },
    });
  } catch (e) {
    next(e);
  }
};
