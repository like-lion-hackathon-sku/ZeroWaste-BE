// 위치: src/favorites/service/favorites.service.js
import * as favRepo from "../repository/favorites.repository.js";
import * as restSvc from "../../restaurants/service/restaurants.service.js";
import * as restRepo from "../../restaurants/repository/restaurants.repository.js";

// 식당 추가 서비스(DB에 식당이 있을때) 
export async function addFavoriteById(userId, restaurantId) {
  // 1) 식당 존재 확인
  const exists = await restRepo.findById(restaurantId);
  if (!exists) {
    const err = new Error("RESTAURANT_NOT_FOUND");
    err.status = 404;
    throw err;
  }
  // 2) 멱등 추가
  const created = await favRepo.ensureFavorite(userId, restaurantId);
  return { restaurantId, created };
}

/* 식당 추가 서비스(DB에 식당이 없을때) */
export async function addFavoriteByExternalPlace(userId, placePayload) {
  // 1) 외부 place → 내부 식당 멱등 동기화
  const { restaurantId } = await restSvc.syncExternalPlace(placePayload);
  // 2) 멱등 즐겨찾기
  const created = await favRepo.ensureFavorite(userId, restaurantId);
  return { restaurantId, created };
}

/* 즐겨찾기 삭제 서비스 */
export async function removeFavorite(userId, restaurantId) {
  await favRepo.deleteFavorite(userId, restaurantId);
}

/* 즐겨찾기 목록 조회 */
export async function listMyFavorites(userId, q) {
  return favRepo.findByUser(userId, q);
}