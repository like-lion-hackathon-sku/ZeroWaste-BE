// 위치: src/favorites/dto/favorites.response.dto.js

/**
 * 즐겨찾기 추가 응답 DTO
 */
export class AddFavoriteResponseDto {
  constructor({ restaurantId, created }) {
    this.restaurantId = restaurantId;
    this.created = created; // true = 새로 추가됨, false = 이미 있었음(멱등)
  }
}

/**
 * 즐겨찾기 삭제 응답 DTO
 */
export class RemoveFavoriteResponseDto {
  constructor({ restaurantId }) {
    this.restaurantId = restaurantId;
    this.removed = true;
  }
}

/**
 * 즐겨찾기 아이템 DTO
 */
export class FavoriteItemResponseDto {
  constructor(fav) {
    this.id = fav.id;
    this.restaurantId = fav.restaurantId;
    this.name = fav.name;
    this.category = fav.category;
    this.address = fav.address;
    this.telephone = fav.telephone;
    this.mapx = fav.mapx;
    this.mapy = fav.mapy;
    this.created_at = fav.created_at;
  }
}

/**
 * 즐겨찾기 목록 응답 DTO
 */
export class FavoritesListResponseDto {
  constructor({ items, nextCursor, total }) {
    this.items = items.map((r) => new FavoriteItemResponseDto(r));
    this.nextCursor = nextCursor;
    this.total = total;
  }
}