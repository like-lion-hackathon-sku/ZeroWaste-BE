// 위치: src / restaurants / dto / response / restaurans.response.dto.js
// 제작자: 김민호
// 최종 수정일: 2025 09 16 21:53

/* 식당 확보(멱등) 응답 DTO
 *
 * - 클라이언트가 식당을 보장(ensure) 요청한 뒤 서버가 반환하는 응답 형식
 * - restaurantId: 최종적으로 확보된 식당의 ID
 * - created: true면 새로 생성된 경우, false면 기존 식당을 재사용한 경우
 *
 * 사용 예시:
 * { "restaurantId": 12, "created": true }
 */
export class EnsureRestaurantResponseDto {
  constructor(result) {
    // 최종 확보된 식당 ID
    this.restaurantId = result.restaurantId;

    // 신규 생성 여부 (true = 새로 생성, false = 기존 재사용)
    this.created = result.created;
  }
}
