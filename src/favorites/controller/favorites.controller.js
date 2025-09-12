// src/favorites/controller/favorites.controller.js
import { StatusCodes } from "http-status-codes";
import {
  addFavorite,
  removeFavorite,
  listMyFavorites,
} from "../service/favorites.service.js";

// 공통: 안전 정수 변환
const toPosInt = (v, d) => (Number.isFinite(+v) && +v > 0 ? Math.floor(+v) : d);

/** 목록 */
export const listMyFavoritesCtrl = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        resultType: "FAILURE",
        error: "UNAUTHORIZED",
        success: null,
      });
    }
    const page = toPosInt(req.query.page, 1);
    const size = toPosInt(req.query.size, 20);

    const data = await listMyFavorites(userId, { page, size });
    return res
      .status(StatusCodes.OK)
      .json({ resultType: "SUCCESS", error: null, success: data });
  } catch (e) {
    console.error("[FAV][LIST] error:", e); // 👈 원인 출력
    next(e);
  }
};

/** 추가/업서트 */
export const upsertFavorite = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        resultType: "FAILURE",
        error: "UNAUTHORIZED",
        success: null,
      });
    }

    // 🔎 요청 검증 (여기서 400로 정리)
    const { restaurantId, place } = req.body ?? {};
    const rid = toPosInt(restaurantId, null);
    if (rid == null && !place) {
      console.warn("[FAV][UPSERT] invalid body:", req.body);
      return res.status(StatusCodes.BAD_REQUEST).json({
        resultType: "FAILURE",
        error: "RESTAURANT_ID_OR_PLACE_REQUIRED",
        success: null,
      });
    }

    const result = await addFavorite({ userId, restaurantId: rid, place });
    return res
      .status(StatusCodes.OK)
      .json({ resultType: "SUCCESS", error: null, success: result });
  } catch (e) {
    console.error("[FAV][UPSERT] error:", e); // 👈 스택 확인
    next(e);
  }
};

/** 삭제 */
export const removeFavoriteById = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        resultType: "FAILURE",
        error: "UNAUTHORIZED",
        success: null,
      });
    }
    const restaurantId = toPosInt(req.params.restaurantId, null);
    if (restaurantId == null) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        resultType: "FAILURE",
        error: "INVALID_RESTAURANT_ID",
        success: null,
      });
    }

    await removeFavorite(userId, restaurantId);
    return res
      .status(StatusCodes.OK)
      .json({ resultType: "SUCCESS", error: null, success: true });
  } catch (e) {
    console.error("[FAV][DELETE] error:", e);
    next(e);
  }
};
export const listRestaurantReviewsCtrl = async (req, res, next) => {
  try {
    const idParsed = parseRestaurantIdParam(req.params);
    if (!idParsed.ok)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(buildError(idParsed.error));

    const q = parseListRestaurantReviewsQuery(req.query);
    const userId = req.user?.id ?? req.payload?.id ?? null; // 로그인 선택적(필요시 용도에 사용)

    const data = await listReviewsByRestaurant(idParsed.value.restaurantId, q, {
      userId,
    });

    return res
      .status(StatusCodes.OK)
      .json(
        buildListRestaurantReviewsResponse(
          data.items,
          data.pageInfo.page,
          data.pageInfo.size,
          data.pageInfo.total,
        ),
      );
  } catch (e) {
    next(e);
  }
};
