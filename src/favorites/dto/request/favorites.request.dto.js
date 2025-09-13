// 위치: src / favorites / dto / request / favorites.request.dto.js
// 즐겨찾기 Request DTO (순수 JS, 가벼운 검증 포함)
/**
 * GET /api/favorites?page&size
 *
 * @param {object} [query={}] - 요청 쿼리
 * @param {string|number} [query.page] - 페이지 번호(양의 정수, 기본 1)
 * @param {string|number} [query.size] - 페이지 크기(양의 정수, 기본 20)
 * @returns {{ page:number, size:number }}
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

/**
 * POST /api/favorites
 * body: { restaurantId:number, place?:string }
 *
 * @param {object} [body={}] - 요청 body
 * @param {string|number} body.restaurantId - 필수, 양의 정수
 * @param {string=} body.place - 선택 문자열
 * @returns {{ ok:boolean, errors:string[], value:{ restaurantId:number|null, place?:string } }}
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

/**
 * DELETE /api/favorites/:restaurantId
 *
 * @param {object} [params={}] - 라우트 파라미터
 * @param {string|number} params.restaurantId - 식당 ID
 * @returns {{ ok:boolean, error:string|null, value:{ restaurantId:number }|null }}
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

/** 공통: 양의 정수 변환 */
const toPosInt = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : d;
};

/**
 * 특정 식당 ID 파라미터 파싱
 *
 * @param {object} [params={}]
 * @param {string|number} params.restaurantId - 식당 ID
 * @returns {{ ok:true, value:{restaurantId:number} } | { ok:false, error:string, value:null }}
 */
export function parseRestaurantIdParam(params = {}) {
  const n = Number(params.restaurantId);
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, error: "INVALID_RESTAURANT_ID", value: null };
  }
  return { ok: true, value: { restaurantId: Math.floor(n) } };
}

/**
 * GET /api/restaurants/:restaurantId/reviews?page&size&sort&rating
 *
 * @param {object} [query={}] - 요청 쿼리
 * @param {string|number} [query.page] - 페이지 번호(양의 정수, 기본 1)
 * @param {string|number} [query.size] - 페이지 크기(양의 정수, 기본 20, 최대 50)
 * @param {"latest"|"rating"} [query.sort] - 정렬 기준(latest 기본)
 * @param {string|number} [query.rating] - 필터링할 별점(1~5 기대)
 * @returns {{ page:number, size:number, sort:"latest"|"rating", rating:number|null }}
 */
export function parseListRestaurantReviewsQuery(query = {}) {
  const page = toPosInt(query.page, 1);
  const size = Math.min(toPosInt(query.size, 20), 50);
  const sort = ["latest", "rating"].includes(String(query.sort ?? "latest"))
    ? String(query.sort ?? "latest")
    : "latest";
  const rating = query.rating != null ? toPosInt(query.rating, null) : null;
  return { page, size, sort, rating };
}
