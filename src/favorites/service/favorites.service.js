// 위치: src/favorites/service/favorites.service.js
import * as favRepo from "../repository/favorites.repository.js";
import * as restSvc from "../../restaurants/service/restaurants.service.js";
import * as restRepo from "../../restaurants/repository/restaurants.repository.js";

/**
 * 즐겨찾기 추가 (단일 엔트리)
 */
export async function addFavorite({ userId, restaurantId, place }) {
  if (restaurantId == null && !place) {
    const err = new Error("RESTAURANT_ID_OR_PLACE_REQUIRED");
    err.status = 400;
    throw err;
  }

  let finalRestaurantId = restaurantId;

  if (finalRestaurantId != null) {
    const exists = await restRepo.findById(finalRestaurantId);
    if (!exists) {
      if (!place) {
        const err = new Error("RESTAURANT_NOT_FOUND");
        err.status = 404;
        throw err;
      }
    } else {
      // ⭐ 여기 인자명 주의: restaurantsId
      const created = await favRepo.ensureFavorite(userId, finalRestaurantId);
      return { restaurantId: finalRestaurantId, created };
    }
  }

  if (!place) {
    const err = new Error("PLACE_PAYLOAD_REQUIRED");
    err.status = 400;
    throw err;
  }

  const { restaurantId: syncedRestaurantId } =
    await restSvc.syncExternalPlace(place);
  finalRestaurantId = syncedRestaurantId;

  // ⭐ 여기 인자명 주의: restaurantsId
  const created = await favRepo.ensureFavorite(userId, finalRestaurantId);
  return { restaurantId: finalRestaurantId, created };
}

/** 즐겨찾기 삭제 */
export async function removeFavorite(userId, restaurantId) {
  // ⭐ 인자명 주의
  await favRepo.deleteFavorite(userId, restaurantId);
}

/** 즐겨찾기 목록 */
export async function listMyFavorites(userId, q) {
  return favRepo.findByUser(userId, q);
}
