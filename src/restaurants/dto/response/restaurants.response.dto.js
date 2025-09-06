/** 식당 확보(멱등) 응답 DTO */
export class EnsureRestaurantResponseDto {
  /** @param {{ restaurantId:number, created:boolean }} result */
  constructor(result) {
    this.restaurantId = result.restaurantId;
    this.created = result.created;
  }
}
