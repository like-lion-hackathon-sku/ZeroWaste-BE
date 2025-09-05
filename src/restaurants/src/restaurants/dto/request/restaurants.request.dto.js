export class NearbyRestaurantsRequestDto {
  constructor({ bbox, limit, cursor }) {
    this.bbox = bbox;               // 'left,bottom,right,top'
    this.limit = Number(limit ?? 20);
    this.cursor = Number(cursor ?? 0);
  }
}

export class SyncRestaurantRequestDto {
  constructor({ name, category, address, telephone, mapx, mapy, is_sponsored }) {
    this.name = name;
    this.category = category ?? null;
    this.address = address;
    this.telephone = telephone ?? null;
    this.mapx = Number(mapx);
    this.mapy = Number(mapy);
    this.is_sponsored = !!is_sponsored;
  }
}