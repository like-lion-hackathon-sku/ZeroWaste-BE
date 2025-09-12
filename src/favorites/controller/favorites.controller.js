// 위치: src/favorites/controller/favorites.controller.js
import {
  addFavorite,
  removeFavorite,
  listMyFavorites,
} from "../service/favorites.service.js";
import { StatusCodes } from "http-status-codes";
import { getReqUserId } from "../../utils/request-user.js";
const userId = getReqUserId(req);

/** 즐겨찾기 목록 */
export const listMyFavoritesCtrl = async (req, res, next) => {
  try {
    const userId = req.user?.id; // ★ 통일된 접근 방식
    if (!userId) throw new Error("NO_USER_ID");

    const page =
      Number.isFinite(+req.query.page) && +req.query.page > 0
        ? +req.query.page
        : 1;
    const size =
      Number.isFinite(+req.query.size) && +req.query.size > 0
        ? +req.query.size
        : 20;

    const data = await listMyFavorites(userId, { page, size });
    if (typeof res.success === "function") return res.success(data, 200);
    return res
      .status(200)
      .json({ resultType: "SUCCESS", error: null, success: data });
  } catch (e) {
    next(e);
  }
};

/** 즐겨찾기 추가(멱등) */
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
    const userId = req.user?.id;
    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        resultType: "FAILURE",
        error: "UNAUTHORIZED",
        success: null,
      });
    }
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
