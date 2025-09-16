// 위치: src / restaurants / dto / request / restaurans.request.dto.js
// 제작자: 김민호
// 최종 수정일: 2025 09 16 21:52

/* Restaurant 멱등 확보 요청 DTO
 *
 * - 클라이언트가 식당을 보장(ensure)할 때 사용하는 요청 형식
 * - 두 가지 방법으로 요청 가능:
 *   1) restaurantId를 직접 지정 → 이미 존재하는 식당을 보장
 *   2) place 객체를 전달 → DB에 없으면 새로 생성
 *
 * 사용 예시:
 * { "restaurantId": 5 }
 * 또는
 * { "place": { "name": "김밥천국", "address": "서울시 강남구 ..." } }
 */
export class EnsureRestaurantRequestDto {
  constructor(body) {
    // DB에 이미 존재하는 식당 ID (없으면 null)
    this.restaurantId = body?.restaurantId ?? null;

    // 외부 place payload (이름과 주소는 필수, 카테고리/전화/좌표는 선택)
    this.place = body?.place ?? null;
  }
}
