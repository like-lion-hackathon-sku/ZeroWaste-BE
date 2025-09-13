// 위치: src / restaurants / dto / request / restaurans.request.dto.js
/**
 * @typedef RestaurantRequestById
 * @property {number} restaurantId - 이미 DB에 존재하는 식당 ID
 */

/**
 * @typedef RestaurantRequestByPlace
 * @property {object} place - 외부 place payload
 * @property {string} place.name - 식당명 (필수)
 * @property {string} place.address - 주소 (필수)
 * @property {string} [place.category] - 카테고리 문자열
 * @property {string} [place.telephone] - 전화번호
 * @property {number} [place.mapx] - 지도 좌표 X
 * @property {number} [place.mapy] - 지도 좌표 Y
 */

/**
 * Restaurant 멱등 확보 요청 DTO
 *
 * - `restaurantId`를 직접 지정하거나
 * - `place` 객체를 전달하여 새로 생성/보장할 수 있음
 */
export class EnsureRestaurantRequestDto {
  /**
   * @param {Partial<RestaurantRequestById & RestaurantRequestByPlace>} body
   */
  constructor(body) {
    /** @type {number|null} DB에 존재하는 식당 ID */
    this.restaurantId = body?.restaurantId ?? null;

    /** @type {RestaurantRequestByPlace["place"]|null} 외부 place payload */
    this.place = body?.place ?? null;
  }
}
