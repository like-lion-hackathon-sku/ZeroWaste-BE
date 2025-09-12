// 위치: src / favorites / service / favorites.service.js
import * as favRepo from "../repository/favorites.repository.js";
import * as restSvc from "../../restaurants/service/restaurants.service.js";
import * as restRepo from "../../restaurants/repository/restaurants.repository.js";

/**
 * 즐겨찾기 추가 (단일 엔트리)
 * - place 로 동기화된 restaurantId가 기존 즐겨찾기의 동일 상호/주소와 다르면
 *   👉 기존 즐겨찾기를 새 restaurantId 로 "재할당" 한다(merge).
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
      // 아래 place 흐름으로 이어짐
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

  // 3) ✅ 동일 이름/주소의 기존 즐겨찾기가 다른 restaurantId 를 가리키면 재할당
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
    // 재할당이 0이면(동시에 생성되는 등) 멱등 추가 시도
    if (!moved) {
      const created = await favRepo.ensureFavorite(userId, finalRestaurantId);
      return {
        restaurantId: finalRestaurantId,
        created,
      };
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

/** 즐겨찾기 삭제 */
export async function removeFavorite(userId, restaurantId) {
  await favRepo.deleteFavorite(userId, restaurantId);
}

/** 즐겨찾기 목록 */
export async function listMyFavorites(userId, q) {
  return favRepo.findByUser(userId, q);
}
