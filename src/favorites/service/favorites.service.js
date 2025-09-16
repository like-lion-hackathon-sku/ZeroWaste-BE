// 위치: src / favorites / service / favorites.service.js
import * as favRepo from "../repository/favorites.repository.js";
import * as restSvc from "../../restaurants/service/restaurants.service.js";
import * as restRepo from "../../restaurants/repository/restaurants.repository.js";

/* 즐겨찾기 추가 (멱등)
 *
 * 동작 규칙:
 * 1) restaurantId가 있으면 그대로 즐겨찾기를 보장(ensure).
 *    - 존재하지 않으면 place가 있는 경우에만 place 흐름으로 진행.
 *    - place도 없으면 에러(404).
 * 2) restaurantId가 없으면 place payload로 내부 식당을 동기화(syncExternalPlace).
 *    - place가 없으면 에러(400).
 * 3) 같은 사용자에 대해 동일한 이름+주소 즐겨찾기가 이미 다른 restaurantId를 가리키면,
 *    기존 즐겨찾기를 새 restaurantId로 재할당(merge).
 *    - 성공하면 reassignedFrom 필드에 기존 restaurantId를 반환.
 * 4) 위 조건이 없으면 일반적인 즐겨찾기 추가 (멱등, 이미 있으면 추가 안 함).
 *
 * 예외 상황:
 * - restaurantId와 place 둘 다 없으면 400 RESTAURANT_ID_OR_PLACE_REQUIRED
 * - restaurantId가 존재하지 않고 place도 없으면 404 RESTAURANT_NOT_FOUND
 * - place가 필요한데 없는 경우 400 PLACE_PAYLOAD_REQUIRED
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
      // 존재하지 않지만 place가 있으니 place 흐름으로 진행
    } else {
      const created = await favRepo.ensureFavorite(userId, finalRestaurantId);
      return { restaurantId: finalRestaurantId, created };
    }
  }

  // 2) place로 내부 식당 동기화
  if (!place) {
    const err = new Error("PLACE_PAYLOAD_REQUIRED");
    err.status = 400;
    throw err;
  }

  const { restaurantId: syncedRestaurantId } =
    await restSvc.syncExternalPlace(place);

  finalRestaurantId = syncedRestaurantId;

  // 3) 동일 이름/주소 즐겨찾기가 다른 restaurantId를 가리키는 경우 → 재할당
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
      // 경쟁 상황 등으로 실제 재할당이 없었으면 멱등 추가 시도
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

/* 즐겨찾기 삭제
 * - 단순히 repository 레벨 deleteFavorite 호출
 * - 존재하지 않아도 에러 없이 안전하게 처리됨
 */
export async function removeFavorite(userId, restaurantId) {
  await favRepo.deleteFavorite(userId, restaurantId);
}

/* 내 즐겨찾기 목록 조회
 * - page/size 옵션을 받아서 페이징 처리된 목록을 반환
 */
export async function listMyFavorites(userId, q) {
  return favRepo.findByUser(userId, q);
}

/* 특정 식당의 리뷰 목록 조회
 *
 * 흐름:
 * 1) restaurantId가 실제로 존재하는지 확인
 *    - 없으면 404 RESTAURANT_NOT_FOUND
 * 2) repository 레벨(findReviewsByRestaurant)에서
 *    리뷰 목록 + 페이징 정보를 가져옴
 */
export async function listReviewsByRestaurant(
  restaurantId,
  { page, size, sort, rating },
  ctx = {},
) {
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
