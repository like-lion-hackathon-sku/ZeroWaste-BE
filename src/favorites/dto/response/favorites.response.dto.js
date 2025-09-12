// 즐겨찾기 Response DTO (통일된 wrapper)

/**
 * 공통 응답 래퍼
 * @template T
 * @param {"SUCCESS"|"FAILURE"} resultType
 * @param {T|null} data
 * @param {string|null} error
 */
export function wrap(resultType, data = null, error = null) {
  return { resultType, error, success: data };
}

/**
 * 목록 응답 빌더
 * @param {Array} items
 * @param {number} page
 * @param {number} size
 * @param {number} totalCount
 */
export function buildListFavoritesResponse(items, page, size, totalCount) {
  return wrap("SUCCESS", { items, page, size, totalCount }, null);
}

/**
 * 업서트 응답 빌더
 * @param {{id:number, restaurantId:number, createdAt:string}} row
 */
export function buildUpsertFavoriteResponse(row) {
  return wrap("SUCCESS", row, null);
}

/**
 * 삭제 응답 빌더 (true 고정)
 */
export function buildRemoveFavoriteResponse() {
  return wrap("SUCCESS", true, null);
}

/**
 * 에러 응답
 * @param {string} message
 */
export function buildError(message) {
  return wrap("FAILURE", null, message);
}
export function wrap(resultType, data = null, error = null) {
  return { resultType, error, success: data };
}

export function buildListRestaurantReviewsResponse(
  items,
  page,
  size,
  totalCount,
) {
  return wrap("SUCCESS", { items, page, size, totalCount }, null);
}

export function buildError(message) {
  return wrap("FAILURE", null, message);
}
