// 위치: src / restaurants / controller / restaurans.controller.js
import { StatusCodes } from "http-status-codes";
import {
  ensureRestaurant,
  getRestaurantDetail,
} from "../service/restaurants.service.js";

/* PUT /api/restaurants
 * 식당 멱등 확보 컨트롤러
 *
 * - 요청 body에 restaurantId 또는 place를 받아 처리
 * - restaurantId가 있으면 DB에서 존재 여부 확인 후 반환
 * - 없거나 유효하지 않으면 place(name, address 필수) 기준으로 새로 생성
 * - 이미 있으면 기존 ID 반환, 없으면 새로 생성 후 ID 반환
 *
 * 성공 응답 예시:
 * {
 *   resultType: "SUCCESS",
 *   error: null,
 *   success: { restaurantId: 12, created: true }
 * }
 */
export const ensureRestaurantCtrl = async (req, res, next) => {
  try {
    const { restaurantId, place } = req.body ?? {};
    const result = await ensureRestaurant({ restaurantId, place });

    // 공통 응답 포맷 헬퍼(res.success)가 있으면 사용
    if (typeof res.success === "function")
      return res.success(result, StatusCodes.OK);

    // 없으면 직접 JSON 응답
    return res
      .status(StatusCodes.OK)
      .json({ resultType: "SUCCESS", error: null, success: result });
  } catch (e) {
    next(e);
  }
};

/* GET /api/restaurants/:restaurantId/detail
 * 특정 식당 상세 조회 컨트롤러
 *
 * - restaurantId를 파라미터로 받아 DB에서 조회
 * - 존재하지 않으면 404 반환
 * - 로그인한 사용자면 즐겨찾기 여부(isFavorite)도 함께 반환
 *
 * 성공 응답 예시:
 * {
 *   resultType: "SUCCESS",
 *   error: null,
 *   success: {
 *     id: 3,
 *     name: "한식당",
 *     category: "KOREAN",
 *     address: "서울시 강남구...",
 *     telephone: "02-123-4567",
 *     mapx: 127.12345,
 *     mapy: 37.54321,
 *     isSponsored: false,
 *     stats: {
 *       reviews: 10,
 *       photos: 8,
 *       avgLeftoverRatio: 0.15,
 *       ecoScore: 4.2
 *     },
 *     isFavorite: true
 *   }
 * }
 *
 * 실패 응답 예시:
 * { ok: false, error: "NOT_FOUND" }
 */
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
      success: dbDetail,
    });
  } catch (e) {
    next(e);
  }
};

/* ===================== DTO ===================== */

/* EnsureRestaurant 요청 DTO
 * - 클라이언트에서 보낸 body를 정리하는 용도
 * - restaurantId 또는 place를 가질 수 있음
 */
export class EnsureRestaurantRequestDto {
  constructor(body) {
    this.restaurantId = body?.restaurantId ?? null;
    this.place = body?.place ?? null;
  }
}

/* EnsureRestaurant 응답 DTO
 * - 컨트롤러에서 클라이언트로 반환할 데이터 형태
 * - restaurantId와 created 여부를 포함
 */
export class EnsureRestaurantResponseDto {
  constructor(result) {
    this.restaurantId = result.restaurantId;
    this.created = result.created;
  }
}
