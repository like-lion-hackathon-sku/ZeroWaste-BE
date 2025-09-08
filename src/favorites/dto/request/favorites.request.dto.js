/**
 * 즐겨찾기 추가 (restaurantId 보유 시)
 */
export class AddFavoriteByIdRequestDto {
  /**
   * @param {number} restaurantId - 식당 ID
   */
  constructor({ restaurantId }) {
    this.restaurantId = Number(restaurantId);
  }
}

/**
 * 즐겨찾기 추가 (외부 place 데이터만 있을 때)
 * - 네이버 place API에서 받은 데이터를 body로 전달
 */
export class AddFavoriteByExternalRequestDto {
  /**
   * @param {object} p
   * @param {string} p.name
   * @param {string} p.address
   * @param {number} p.mapx
   * @param {number} p.mapy
   * @param {string=} p.category
   * @param {string} p.telephone         // ★ Prisma Restaurants.telephone required
   * @param {boolean=} p.is_sponsored
   */
  constructor({
    name,
    address,
    mapx,
    mapy,
    category,
    telephone,
    is_sponsored,
  }) {
    this.name = name;
    this.address = address;
    this.mapx = Number(mapx);
    this.mapy = Number(mapy);
    this.category = category ?? null;
    this.telephone = telephone; // 없으면 서비스단에서 400 처리
    this.is_sponsored = !!is_sponsored;
  }
}

/**
 * 즐겨찾기 삭제 요청
 * - Path param 으로 restaurantId 전달
 */
export class RemoveFavoriteRequestDto {
  constructor({ restaurantId }) {
    this.restaurantId = Number(restaurantId);
  }
}
