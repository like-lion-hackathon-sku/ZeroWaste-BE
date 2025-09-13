// 위치: src / restaurants / dto / response / restaurans.response.dto.js
/**
 * @typedef EnsureRestaurantResponse
 * @property {number} restaurantId - 최종 확보된 식당 ID
 * @property {boolean} created - 새로 생성되었는지 여부 (true: 신규 생성, false: 기존 재사용)
 */

/** 식당 확보(멱등) 응답 DTO */
export class EnsureRestaurantResponseDto {
  /**
   * @param {EnsureRestaurantResponse} result
   */
  constructor(result) {
    /** @type {number} 최종 확보된 식당 ID */
    this.restaurantId = result.restaurantId;

    /** @type {boolean} 신규 생성 여부 */
    this.created = result.created;
  }
}
