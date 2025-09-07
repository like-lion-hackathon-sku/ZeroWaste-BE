// 위치: src/restaurants/controller/restaurants.controller.js
import { StatusCodes } from "http-status-codes";
import {
  ensureRestaurant,
  getRestaurantDetail,
  getRestaurantExternalDetail, // 외부 상세 추가
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

/** GET /api/restaurants/:restaurantId  (DB 상세조회) */
export const getRestaurantDetailCtrl = async (req, res, next) => {
  try {
    const restaurantId = Number(req.params.restaurantId);
    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }
    const userId = req.user?.id ?? null;
    const data = await getRestaurantDetail(restaurantId, userId);

    if (typeof res.success === "function")
      return res.success(data, StatusCodes.OK);
    return res
      .status(StatusCodes.OK)
      .json({ resultType: "SUCCESS", error: null, success: data });
  } catch (e) {
    next(e);
  }
};

/** GET /api/restaurants/:restaurantId/external (네이버 상세조회) */
export const getRestaurantExternalDetailCtrl = async (req, res, next) => {
  try {
    const restaurantId = Number(req.params.restaurantId);
    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }
    const data = await getRestaurantExternalDetail(restaurantId);

    return res.status(StatusCodes.OK).json({
      resultType: "SUCCESS",
      error: null,
      success: data,
    });
  } catch (e) {
    next(e);
  }
};
