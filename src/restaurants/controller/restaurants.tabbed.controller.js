// 위치: src/restaurants/controller/restaurants/tabbed.controller.js
import { StatusCodes } from "http-status-codes";
import { getRestaurantTabbedDetail } from "../service/restaurants.service.js";

export const getRestaurantTabbedDetailCtrl = async (req, res, next) => {
  try {
    const restaurantId = Number(req.params.restaurantId);
    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    const userId = req.user?.id ?? null;
    const result = await getRestaurantTabbedDetail(restaurantId, userId);

    return res.status(StatusCodes.OK).json({
      resultType: "SUCCESS",
      error: null,
      success: result,
    });
  } catch (e) {
    next(e);
  }
};
