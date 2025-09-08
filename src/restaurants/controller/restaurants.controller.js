// 위치: src/restaurants/controller/restaurants.controller.js
import { StatusCodes } from "http-status-codes";
import {
  ensureRestaurant,
  getRestaurantTabbedDetail, // 탭형 상세 한 번에
} from "../service/restaurants.service.js";

/** PUT /api/restaurants  (멱등 확보) */
export const ensureRestaurantCtrl = async (req, res, next) => {
  try {
    const { restaurantId, place } = req.body ?? {};
    const result = await ensureRestaurant({ restaurantId, place });

    if (typeof res.success === "function") {
      return res.success(result, StatusCodes.OK);
    }
    return res
      .status(StatusCodes.OK)
      .json({ resultType: "SUCCESS", error: null, success: result });
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/restaurants/:restaurantId/detail
 * - FE에서 한 번에 필요로 하는 탭형 상세(payload) 반환
 *   header + tabs.info/menu/gallery/review
 */
export const getRestaurantFullDetailCtrl = async (req, res, next) => {
  try {
    const restaurantId = Number(req.params.restaurantId);
    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }
    const userId = req.user?.id ?? null;

    const payload = await getRestaurantTabbedDetail(restaurantId, userId);

    return res.status(StatusCodes.OK).json({
      resultType: "SUCCESS",
      error: null,
      success: payload,
    });
  } catch (e) {
    next(e);
  }
};

/* ── (선택) DTO: 문서/Swagger용 ─────────────────────────────────── */
export class EnsureRestaurantRequestDto {
  /** @param {{ restaurantId?:number, place?: {
   *   name:string, address:string, category?:string,
   *   telephone?:string, mapx?:number, mapy?:number
   * }}} body
   */
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
