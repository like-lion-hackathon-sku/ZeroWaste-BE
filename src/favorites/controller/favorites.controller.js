// 위치: src/favorites/controller/favorites.controller.js
import {
  addFavorite,
  removeFavorite,
  listMyFavorites,
} from "../service/favorites.service.js";
import { StatusCodes } from "http-status-codes";

/** 즐겨찾기 목록 */
export const listMyFavoritesCtrl = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // page/size를 숫자로 정규화
    const pageRaw = req.query.page ?? 1;
    const sizeRaw = req.query.size ?? 20;
    const page = Number.isFinite(+pageRaw) && +pageRaw > 0 ? +pageRaw : 1;
    const size = Number.isFinite(+sizeRaw) && +sizeRaw > 0 ? +sizeRaw : 20;

    const data = await listMyFavorites(userId, { page, size });

    if (typeof res.success === "function")
      return res.success(data, StatusCodes.OK);

    return res
      .status(StatusCodes.OK)
      .json({ resultType: "SUCCESS", error: null, success: data });
  } catch (e) {
    next(e);
  }
};

/** 즐겨찾기 추가(멱등) */
export const upsertFavorite = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { restaurantId, place } = req.body ?? {};
    const result = await addFavorite({ userId, restaurantId, place });

    if (typeof res.success === "function")
      return res.success(result, StatusCodes.OK);

    return res
      .status(StatusCodes.OK)
      .json({ resultType: "SUCCESS", error: null, success: result });
  } catch (e) {
    next(e);
  }
};

/** 즐겨찾기 삭제 */
export const removeFavoriteById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const restaurantId = Number(req.params.restaurantId);

    await removeFavorite(userId, restaurantId);

    if (typeof res.success === "function")
      return res.success(true, StatusCodes.OK);

    return res
      .status(StatusCodes.OK)
      .json({ resultType: "SUCCESS", error: null, success: true });
  } catch (e) {
    next(e);
  }
};
