// 위치: src / favorites / dto / response / favorites.response.dto.js
// 즐겨찾기 Response DTO - 통일된 응답 포맷 빌더 모음

/* 공통 응답 래퍼
 * - 모든 응답은 { resultType, error, success } 구조를 따름
 * - resultType: "SUCCESS" 또는 "FAILURE"
 * - error: 실패 시 메시지, 성공 시 null
 * - success: 성공 데이터, 실패 시 null
 */
export function wrap(resultType, data = null, error = null) {
  return { resultType, error, success: data };
}

/* 즐겨찾기 목록 응답 빌더
 * - items: 즐겨찾기 배열
 * - page: 현재 페이지 번호
 * - size: 페이지 크기
 * - totalCount: 전체 개수
 */
export function buildListFavoritesResponse(items, page, size, totalCount) {
  return wrap("SUCCESS", { items, page, size, totalCount }, null);
}

/* 즐겨찾기 추가/업서트 응답 빌더
 * - row: DB에 저장된 즐겨찾기 레코드
 *   { id, restaurantId, createdAt } 형태 기대
 */
export function buildUpsertFavoriteResponse(row) {
  return wrap("SUCCESS", row, null);
}

/* 즐겨찾기 삭제 응답 빌더
 * - 항상 { success: true } 반환
 */
export function buildRemoveFavoriteResponse() {
  return wrap("SUCCESS", true, null);
}

/* 에러 응답 빌더
 * - message: 에러 메시지 문자열
 * - resultType을 FAILURE로 설정
 */
export function buildError(message) {
  return wrap("FAILURE", null, message);
}

/* 특정 식당 리뷰 목록 응답 빌더
 * - items: 리뷰 배열
 * - page: 현재 페이지 번호
 * - size: 페이지 크기
 * - totalCount: 전체 개수
 */
export function buildListRestaurantReviewsResponse(
  items,
  page,
  size,
  totalCount,
) {
  return wrap("SUCCESS", { items, page, size, totalCount }, null);
}
