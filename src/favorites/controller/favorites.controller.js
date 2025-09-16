// 위치: src / favorites / controller / favorites.controller.js
import { StatusCodes } from "http-status-codes";
import {
  addFavorite,
  removeFavorite,
  listMyFavorites,
  // listReviewsByRestaurant ← 아래 listRestaurantReviewsCtrl에서 필요
} from "../service/favorites.service.js";

// 공통: 숫자를 양의 정수로 변환, 실패 시 기본값 반환
const toPosInt = (v, d) => (Number.isFinite(+v) && +v > 0 ? Math.floor(+v) : d);

/* 내 즐겨찾기 목록 조회 컨트롤러
 *
 * 요청: GET /api/favorites
 * 조건: 로그인 사용자만 접근 가능 (bearerAuth)
 * 동작:
 * 1) userId를 가져옴 (없으면 401 UNAUTHORIZED)
 * 2) page/size 파라미터 정규화
 * 3) 서비스에서 즐겨찾기 목록 조회
 * 4) 결과를 SUCCESS 응답 형식으로 반환
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

/* 즐겨찾기 추가/업서트 컨트롤러
 *
 * 요청: POST /api/favorites 또는 PUT /api/favorites
 * 조건: 로그인 사용자만 접근 가능
 * 동작:
 * 1) body에 restaurantId 또는 place 중 하나가 반드시 있어야 함
 *    → 없으면 400 RESTAURANT_ID_OR_PLACE_REQUIRED
 * 2) 서비스 레이어에서 멱등 보장 (이미 있으면 그대로 반환)
 * 3) 결과(restaurantId, created 여부 등)를 SUCCESS 응답으로 반환
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

/* 즐겨찾기 삭제 컨트롤러
 *
 * 요청: DELETE /api/favorites/:restaurantId
 * 조건: 로그인 사용자만 접근 가능
 * 동작:
 * 1) restaurantId 파라미터가 양의 정수인지 확인
 *    → 아니면 400 INVALID_RESTAURANT_ID
 * 2) 서비스 레이어에서 해당 즐겨찾기 삭제
 * 3) 성공 시 SUCCESS + true 반환
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

/* 특정 식당 리뷰 목록 조회 컨트롤러 (초안)
 *
 * 요청: GET /api/restaurants/:restaurantId/reviews
 * 동작:
 * 1) restaurantId 파라미터 파싱 및 검증
 * 2) query(page, size, sort, rating) 파싱
 * 3) 서비스 레이어(listReviewsByRestaurant) 호출
 * 4) 결과를 공통 응답 포맷(buildListRestaurantReviewsResponse)으로 반환
 *
 * ⚠️ 현재 의존하는 유틸 함수/서비스는 주석에 나열되어 있으며,
 *    실제 프로젝트 구조에 맞게 import 해야 함
 */
export const listRestaurantReviewsCtrl = async (req, res, next) => {
  try {
    const idParsed = parseRestaurantIdParam(req.params);
    if (!idParsed.ok)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(buildError(idParsed.error));

    const q = parseListRestaurantReviewsQuery(req.query);
    const userId = req.user?.id ?? req.payload?.id ?? null; // 로그인 선택적

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
