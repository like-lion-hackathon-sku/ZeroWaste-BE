// 위치: src/favorites/controller/favorites.controller.js
import { StatusCodes } from "http-status-codes";
import {
  addFavorite,
  removeFavorite,
  listMyFavorites,
  // listReviewsByRestaurant ← 아래 listRestaurantReviewsCtrl에서 필요
} from "../service/favorites.service.js";

// ✅ listRestaurantReviewsCtrl에서 필요한 유틸/함수들 (프로젝트 위치에 맞게 import 해주세요)
// import { parseRestaurantIdParam } from "../../common/validators.js";
// import { parseListRestaurantReviewsQuery } from "../../reviews/dto/reviews.request.dto.js";
// import { buildError } from "../../common/http.js";
// import { buildListRestaurantReviewsResponse } from "../../reviews/dto/reviews.response.dto.js";
// import { listReviewsByRestaurant } from "../service/favorites.service.js"; // 혹은 실제 구현 위치

/** 공통: 안전 정수 변환 */
const toPosInt = (v, d) => (Number.isFinite(+v) && +v > 0 ? Math.floor(+v) : d);

/**
 * 내 즐겨찾기 목록 조회 컨트롤러
 *
 * @route GET /api/favorites
 * @security bearerAuth
 * @query {number} page - 페이지(1-base, 기본 1)
 * @query {number} size - 페이지 크기(기본 20)
 * @returns {200} JSON { resultType:"SUCCESS", success:{ items, pageInfo }, error:null }
 * @returns {401} JSON { resultType:"FAILURE", error:"UNAUTHORIZED" }
 */
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
    console.error("[FAV][LIST] error:", e);
    next(e);
  }
};

/**
 * 즐겨찾기 추가/업서트 컨트롤러
 *
 * - body에 restaurantId(양의 정수) 또는 place payload 중 하나는 필수
 * - 서비스 레이어에서 멱등 보장
 *
 * @route POST /api/favorites
 * @route PUT  /api/favorites
 * @security bearerAuth
 * @body {object} body
 * @body {number=} body.restaurantId - 내부 식당 ID
 * @body {object=} body.place - 외부 place 동기화용 payload
 * @returns {200} JSON { resultType:"SUCCESS", success:{ restaurantId, created, reassignedFrom? }, error:null }
 * @returns {400} JSON { resultType:"FAILURE", error:"RESTAURANT_ID_OR_PLACE_REQUIRED" }
 * @returns {401} JSON { resultType:"FAILURE", error:"UNAUTHORIZED" }
 */
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
    console.error("[FAV][UPSERT] error:", e);
    next(e);
  }
};

/**
 * 즐겨찾기 삭제 컨트롤러
 *
 * @route DELETE /api/favorites/:restaurantId
 * @security bearerAuth
 * @param {string} restaurantId.path - 식당 ID(양의 정수)
 * @returns {200} JSON { resultType:"SUCCESS", success:true, error:null }
 * @returns {400} JSON { resultType:"FAILURE", error:"INVALID_RESTAURANT_ID" }
 * @returns {401} JSON { resultType:"FAILURE", error:"UNAUTHORIZED" }
 */
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

/**
 * 특정 식당의 리뷰 목록 조회 컨트롤러
 *
 * 요구 유틸/서비스:
 * - parseRestaurantIdParam(params)            → { ok:boolean, value?:{ restaurantId:number }, error?:string }
 * - parseListRestaurantReviewsQuery(query)    → { page:number, size:number, sort?:"rating"|"recent", rating?:number }
 * - listReviewsByRestaurant(restaurantId, q, ctx)
 * - buildError(code)                          → 공통 오류 응답 포맷
 * - buildListRestaurantReviewsResponse(items, page, size, total)
 *
 * @route GET /api/restaurants/:restaurantId/reviews
 * @param {string} restaurantId.path - 식당 ID(양의 정수)
 * @query {number} page
 * @query {number} size
 * @query {"rating"|"recent"} [sort]
 * @query {number} [rating]
 * @returns {200} JSON (리뷰 목록 + 페이지 정보)
 * @returns {400} JSON { error: "...", ... }
 */
export const listRestaurantReviewsCtrl = async (req, res, next) => {
  try {
    const idParsed = parseRestaurantIdParam(req.params);
    if (!idParsed.ok)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(buildError(idParsed.error));

    const q = parseListRestaurantReviewsQuery(req.query);
    const userId = req.user?.id ?? req.payload?.id ?? null; // 로그인 선택적(필요시 컨텍스트 용도)

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
