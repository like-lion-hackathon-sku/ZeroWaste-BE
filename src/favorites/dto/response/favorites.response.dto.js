// 위치: src / favorites / dto / response / favorites.response.dto.js
// 즐겨찾기 Response DTO (통일된 wrapper)

/**
 * 공통 응답 래퍼
 *
 * @template T
 * @param {"SUCCESS"|"FAILURE"} resultType - 응답 결과 타입
 * @param {T|null} [data=null] - 성공 데이터 (없으면 null)
 * @param {string|null} [error=null] - 에러 메시지 (없으면 null)
 * @returns {{ resultType:"SUCCESS"|"FAILURE", error:string|null, success:T|null }}
 */
export function wrap(resultType, data = null, error = null) {
  return { resultType, error, success: data };
}

/**
 * 즐겨찾기 목록 응답 빌더
 *
 * @param {Array<object>} items - 즐겨찾기 아이템 배열
 * @param {number} page - 현재 페이지
 * @param {number} size - 페이지 크기
 * @param {number} totalCount - 전체 개수
 * @returns {ReturnType<typeof wrap>}
 */
export function buildListFavoritesResponse(items, page, size, totalCount) {
  return wrap("SUCCESS", { items, page, size, totalCount }, null);
}

/**
 * 즐겨찾기 업서트 응답 빌더
 *
 * @param {{id:number, restaurantId:number, createdAt:string}} row - 업서트된 즐겨찾기 레코드
 * @returns {ReturnType<typeof wrap>}
 */
export function buildUpsertFavoriteResponse(row) {
  return wrap("SUCCESS", row, null);
}

/**
 * 즐겨찾기 삭제 응답 빌더
 *
 * @returns {ReturnType<typeof wrap>} - 항상 { success:true }
 */
export function buildRemoveFavoriteResponse() {
  return wrap("SUCCESS", true, null);
}

/**
 * 에러 응답 빌더
 *
 * @param {string} message - 에러 메시지
 * @returns {ReturnType<typeof wrap>}
 */
export function buildError(message) {
  return wrap("FAILURE", null, message);
}

/**
 * 식당 리뷰 목록 응답 빌더
 *
 * @param {Array<object>} items - 리뷰 아이템 배열
 * @param {number} page - 현재 페이지
 * @param {number} size - 페이지 크기
 * @param {number} totalCount - 전체 개수
 * @returns {ReturnType<typeof wrap>}
 */
export function buildListRestaurantReviewsResponse(
  items,
  page,
  size,
  totalCount,
) {
  return wrap("SUCCESS", { items, page, size, totalCount }, null);
}
