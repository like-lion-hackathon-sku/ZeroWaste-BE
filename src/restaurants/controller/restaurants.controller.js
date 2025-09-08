import { StatusCodes } from "http-status-codes";
import {
  ensureRestaurant,
  getRestaurantDetail,
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

/** GET /api/restaurants/:restaurantId/detail  (DB 상세만 반환) */
export const getRestaurantDetailCtrl = async (req, res, next) => {
  try {
    const restaurantId = Number(req.params.restaurantId);
    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    const userId = req.user?.id ?? null;
    const dbDetail = await getRestaurantDetail(restaurantId, userId);

    return res.status(StatusCodes.OK).json({
      resultType: "SUCCESS",
      error: null,
      success: dbDetail, // external 제거
    });
  } catch (e) {
    next(e);
  }
};

/* ===================== DTO ===================== */
export class EnsureRestaurantRequestDto {
  /** @param {{restaurantId?:number, place?:object}} body */
  constructor(body) {
    this.restaurantId = body?.restaurantId ?? null;
    this.place = body?.place ?? null;
  }
}

export class EnsureRestaurantResponseDto {
  /** @param {{ restaurantId:number, created:boolean }} result */
  constructor(result) {
    this.restaurantId = result.restaurantId;
    this.created = result.created;
  }
}
