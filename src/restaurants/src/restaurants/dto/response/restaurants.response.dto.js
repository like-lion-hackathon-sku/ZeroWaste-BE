export class RestaurantItemResponseDto {
  constructor(r) {
    this.id = r.id;
    this.name = r.name;
    this.category = r.category;
    this.address = r.address;
    this.telephone = r.telephone;
    this.mapx = r.mapx;
    this.mapy = r.mapy;
    this.is_sponsored = r.is_sponsored;
    this.created_at = r.created_at;
    this.updated_at = r.updated_at;
  }
}

export class NearbyRestaurantsResponseDto {
  constructor({ items, nextCursor, total }) {
    this.items = items.map((r) => new RestaurantItemResponseDto(r));
    this.nextCursor = nextCursor;
    this.total = total;
  }
}

export class SyncRestaurantResponseDto {
  constructor({ restaurantId, created }) {
    this.restaurantId = restaurantId;
    this.created = created;
  }
}