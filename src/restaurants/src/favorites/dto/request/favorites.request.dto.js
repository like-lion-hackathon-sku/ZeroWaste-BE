// 위치: src/favorites/dto/favorites.request.dto.js

/**
 * 즐겨찾기 추가 (restaurantId 보유 시)
 * - Path param 으로 restaurantId 전달하므로 DTO는 따로 필요 없을 수 있음.
 * - 하지만 일관성을 위해 정의해둠
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
   * @param {string=} p.telephone
   * @param {boolean=} p.is_sponsored
   */
  constructor({ name, address, mapx, mapy, category, telephone, is_sponsored }) {
    this.name = name;
    this.address = address;
    this.mapx = Number(mapx);
    this.mapy = Number(mapy);
    this.category = category ?? null;
    this.telephone = telephone ?? null;
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