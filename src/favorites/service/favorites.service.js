// 위치: src / favorites / service / favorites.service.js
import * as favRepo from "../repository/favorites.repository.js";
import * as restSvc from "../../restaurants/service/restaurants.service.js";
import * as restRepo from "../../restaurants/repository/restaurants.repository.js";

/**
 * 즐겨찾기 추가(멱등)
 *
 * 동작 규칙
 * 1) restaurantId가 유효하면 그걸로 즐겨찾기를 보장(ensure).
 * 2) restaurantId가 없거나 유효하지 않으면 place payload로 내부 식당을 동기화(syncExternalPlace) 후 즐겨찾기 생성.
 * 3) 동일 사용자에 대해 동일 이름/주소로 이미 등록된 즐겨찾기가 "다른 restaurantId"를 가리키면
 *    해당 즐겨찾기를 새 restaurantId로 재할당(merge)합니다.
 *
 * 예외
 * - restaurantId와 place 둘 다 없으면 400(RESTARUANT_ID_OR_PLACE_REQUIRED)
 * - 존재하지 않는 restaurantId이고 place도 없으면 404(RESTAURANT_NOT_FOUND)
 * - place가 필요한 분기에서 place가 없으면 400(PLACE_PAYLOAD_REQUIRED)
 *
 * @async
 * @param {Object} params
 * @param {number} params.userId - 사용자 ID
 * @param {number=} params.restaurantId - 내부 식당 ID(선택)
 * @param {Object=} params.place - 외부 place 동기화용 payload(선택)
 * @param {string} params.place.name - 식당 이름
 * @param {string} params.place.address - 식당 주소
 * @returns {Promise<{restaurantId:number, created:boolean, reassignedFrom?:number}>}
 *  - created: 새로 생성 여부(멱등 보장)
 *  - reassignedFrom: 기존 즐겨찾기가 다른 restaurantId에서 새 restaurantId로 재할당된 경우, 기존 ID
 * @throws {Error & {status:number}}
 */
export async function addFavorite({ userId, restaurantId, place }) {
  if (restaurantId == null && !place) {
    const err = new Error("RESTAURANT_ID_OR_PLACE_REQUIRED");
    err.status = 400;
    throw err;
  }

  let finalRestaurantId = restaurantId;

  // 1) restaurantId 직접 지정된 경우
  if (finalRestaurantId != null) {
    const exists = await restRepo.findById(finalRestaurantId);
    if (!exists) {
      if (!place) {
        const err = new Error("RESTAURANT_NOT_FOUND");
        err.status = 404;
        throw err;
      }
      // 존재하지 않지만 place가 있으니 아래 place 흐름으로 계속
    } else {
      const created = await favRepo.ensureFavorite(userId, finalRestaurantId);
      return { restaurantId: finalRestaurantId, created };
    }
  }

  // 2) place 로 내부 식당 동기화
  if (!place) {
    const err = new Error("PLACE_PAYLOAD_REQUIRED");
    err.status = 400;
    throw err;
  }

  const { restaurantId: syncedRestaurantId } =
    await restSvc.syncExternalPlace(place);

  finalRestaurantId = syncedRestaurantId;

  // 3) 동일 이름/주소로 기존 즐겨찾기가 다른 restaurantId를 가리키면 재할당
  const sameFav = await favRepo.findUserFavoriteByNameAddress(
    userId,
    place.name,
    place.address,
  );

  if (sameFav?.restaurantId && sameFav.restaurantId !== finalRestaurantId) {
    const moved = await favRepo.reassignFavoritesForUser(
      userId,
      sameFav.restaurantId,
      finalRestaurantId,
    );
    if (!moved) {
      // 경쟁 상황 등으로 재할당이 없었으면 멱등 추가 시도
      const created = await favRepo.ensureFavorite(userId, finalRestaurantId);
      return { restaurantId: finalRestaurantId, created };
    }
    return {
      restaurantId: finalRestaurantId,
      created: false,
      reassignedFrom: sameFav.restaurantId,
    };
  }

  // 4) 일반 멱등 추가
  const created = await favRepo.ensureFavorite(userId, finalRestaurantId);
  return { restaurantId: finalRestaurantId, created };
}

/**
 * 즐겨찾기 삭제
 *
 * @async
 * @param {number} userId - 사용자 ID
 * @param {number} restaurantId - 내부 식당 ID
 * @returns {Promise<void>}
 */
export async function removeFavorite(userId, restaurantId) {
  await favRepo.deleteFavorite(userId, restaurantId);
}

/**
 * 내 즐겨찾기 목록 조회
 *
 * @async
 * @param {number} userId - 사용자 ID
 * @param {{page?:number, size?:number, sort?:string}=} q - 페이지네이션/정렬 옵션
 * @returns {Promise<import("../repository/favorites.repository.js").UserFavoriteList>}
 */
export async function listMyFavorites(userId, q) {
  return favRepo.findByUser(userId, q);
}

/**
 * 특정 식당의 리뷰 목록 조회
 *
 * 사전 검사: restaurantId가 유효한 내부 식당인지 확인.
 *
 * @async
 * @param {number} restaurantId - 내부 식당 ID
 * @param {{page?:number, size?:number, sort?:string, rating?:number}} opts - 조회 옵션
 * @param {object} [ctx={}] - 트랜잭션/요청 컨텍스트 등
 * @returns {Promise<import("../../reviews/repository/reviews.repository.js").RestaurantReviewList>}
 * @throws {Error & {status:number}} - 식당이 없으면 404(RESTAURANT_NOT_FOUND)
 */
export async function listReviewsByRestaurant(
  restaurantId,
  { page, size, sort, rating },
  ctx = {},
) {
  // 식당 존재 체크(필요할 때만)
  const exists = await restRepo.findById?.(restaurantId);
  if (!exists) {
    const err = new Error("RESTAURANT_NOT_FOUND");
    err.status = 404;
    throw err;
  }
  return findReviewsByRestaurant(
    restaurantId,
    { page, size, sort, rating },
    ctx,
  );
}
