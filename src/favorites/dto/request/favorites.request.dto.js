// 위치: src / favorites / dto / request / favorites.request.dto.js

/* 즐겨찾기 목록 조회 쿼리 파싱
 *
 * 요청: GET /api/favorites?page&size
 * - page: 페이지 번호 (기본 1)
 * - size: 페이지 크기 (기본 20)
 * - 두 값 모두 양의 정수여야 하며, 잘못된 값이면 기본값으로 대체
 */
export function parseListFavoritesQuery(query = {}) {
  const toPosInt = (v, d) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : d;
  };
  return {
    page: toPosInt(query.page, 1),
    size: toPosInt(query.size, 20),
  };
}

/* 즐겨찾기 추가/업서트 요청 body 검증
 *
 * 요청: POST /api/favorites
 * body: { restaurantId:number, place?:string }
 *
 * 규칙:
 * - restaurantId는 필수, 양의 정수여야 함
 * - place가 있으면 문자열이어야 함
 *
 * 반환: ok 여부, 에러 메시지 배열, 정제된 값
 */
export function validateUpsertFavoriteBody(body = {}) {
  const errors = [];

  const idNum = Number(body.restaurantId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    errors.push("restaurantId must be a positive number");
  }

  if (body.place != null && typeof body.place !== "string") {
    errors.push("place must be a string if provided");
  }

  return {
    ok: errors.length === 0,
    errors,
    value: {
      restaurantId:
        Number.isFinite(idNum) && idNum > 0 ? Math.floor(idNum) : null,
      place: typeof body.place === "string" ? body.place : undefined,
    },
  };
}

/* 즐겨찾기 삭제 요청 파라미터 파싱
 *
 * 요청: DELETE /api/favorites/:restaurantId
 * - restaurantId는 양의 정수여야 함
 *
 * 반환: ok 여부, 에러 메시지, 정제된 값
 */
export function parseRemoveFavoriteParams(params = {}) {
  const idNum = Number(params.restaurantId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    return {
      ok: false,
      error: "restaurantId must be a positive number",
      value: null,
    };
  }
  return { ok: true, error: null, value: { restaurantId: Math.floor(idNum) } };
}

/* 특정 식당 ID 파라미터 파싱
 *
 * 요청: 주로 /api/restaurants/:restaurantId 에서 사용
 * - restaurantId가 양의 정수여야 함
 *
 * 반환: ok 여부, 에러 메시지, 정제된 값
 */
export function parseRestaurantIdParam(params = {}) {
  const n = Number(params.restaurantId);
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, error: "INVALID_RESTAURANT_ID", value: null };
  }
  return { ok: true, value: { restaurantId: Math.floor(n) } };
}

/* 특정 식당 리뷰 목록 조회 쿼리 파싱
 *
 * 요청: GET /api/restaurants/:restaurantId/reviews?page&size&sort&rating
 *
 * 규칙:
 * - page: 기본 1
 * - size: 기본 20, 최대 50
 * - sort: latest 또는 rating (기본 latest)
 * - rating: 별점 필터 (1~5 기대, 없으면 null)
 *
 * 반환: 정제된 쿼리 값
 */
export function parseListRestaurantReviewsQuery(query = {}) {
  const toPosInt = (v, d) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : d;
  };

  const page = toPosInt(query.page, 1);
  const size = Math.min(toPosInt(query.size, 20), 50);
  const sort = ["latest", "rating"].includes(String(query.sort ?? "latest"))
    ? String(query.sort ?? "latest")
    : "latest";
  const rating = query.rating != null ? toPosInt(query.rating, null) : null;

  return { page, size, sort, rating };
}
