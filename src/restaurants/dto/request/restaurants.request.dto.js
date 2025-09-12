// 위치: src / restaurants / dto / request / restaurants.requsest.dto.js
/**
 * @typedef RestaurantRequestById
 * @property {number} restaurantId - 이미 DB에 있는 식당 id
 */

/**
 * @typedef RestaurantRequestByPlace
 * @property {object} place - 외부 place payload
 * @property {string} place.name - 식당명 (필수)
 * @property {string} place.address - 주소 (필수)
 * @property {string} [place.category] - 카테고리 문자열
 * @property {string} [place.telephone] - 전화번호
 * @property {number} [place.mapx] - 좌표 X
 * @property {number} [place.mapy] - 좌표 Y
 */

/** Restaurant 멱등 확보 요청 DTO */
export class EnsureRestaurantRequestDto {
  /** @param {Partial<RestaurantRequestById & RestaurantRequestByPlace>} body */
  constructor(body) {
    this.restaurantId = body?.restaurantId ?? null;
    this.place = body?.place ?? null;
  }
}
