// 즐겨찾기 Request DTO (순수 JS, 가벼운 검증 포함)

/**
 * GET /api/favorites?page&size
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
 */
export function validateUpsertFavoriteBody(body = {}) {
  const errors = [];

  // restaurantId 필수/양의 정수
  const idNum = Number(body.restaurantId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    errors.push("restaurantId must be a positive number");
  }

  // place는 선택 문자열
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
const toPosInt = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : d;
};

export function parseRestaurantIdParam(params = {}) {
  const n = Number(params.restaurantId);
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, error: "INVALID_RESTAURANT_ID", value: null };
  }
  return { ok: true, value: { restaurantId: Math.floor(n) } };
}

/**
 * page,size,sort,rating(필터)
 * sort: latest(기본) | rating
 */
export function parseListRestaurantReviewsQuery(query = {}) {
  const page = toPosInt(query.page, 1);
  const size = Math.min(toPosInt(query.size, 20), 50);
  const sort = ["latest", "rating"].includes(String(query.sort ?? "latest"))
    ? String(query.sort ?? "latest")
    : "latest";
  const rating = query.rating != null ? toPosInt(query.rating, null) : null; // 1~5 기대
  return { page, size, sort, rating };
}
