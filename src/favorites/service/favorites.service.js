import * as favRepo from "../repository/favorites.repository.js";
import * as restSvc from "../../restaurants/service/restaurants.service.js";
import * as restRepo from "../../restaurants/repository/restaurants.repository.js";

/**
 * 즐겨찾기 추가(멱등)
 * - restaurantId가 있으면 바로 즐겨찾기 추가
 * - 없으면 place로 내부 식당 ensure 후 즐겨찾기 추가
 * - 동일 이름/주소 즐겨찾기가 다른 restaurantId를 가리키면 재할당
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
      // place 흐름으로 이어짐
    } else {
      const created = await favRepo.ensureFavorite(userId, finalRestaurantId);
      return { restaurantId: finalRestaurantId, created };
    }
  }

  // 2) place 로 내부 식당 ensure
  if (!place) {
    const err = new Error("PLACE_PAYLOAD_REQUIRED");
    err.status = 400;
    throw err;
  }

  // ✔ 변경점: syncExternalPlace -> ensureRestaurant 사용
  // ensureRestaurant는 Prisma restaurants 레코드를 반환하므로 id를 꺼내 쓴다.
  const ensured = await restSvc.ensureRestaurant({ place });
  const syncedRestaurantId = ensured.id;

  finalRestaurantId = syncedRestaurantId;

  // 3) 동일 이름/주소 즐겨찾기가 다른 restaurantId를 가리키면 재할당
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

export async function removeFavorite(userId, restaurantId) {
  await favRepo.deleteFavorite(userId, restaurantId);
}

export async function listMyFavorites(userId, q) {
  return favRepo.findByUser(userId, q);
}
