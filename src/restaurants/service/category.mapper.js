// 위치: src/restaurants/service/category.mapper.js
import { FoodCategory } from "../../generated/prisma/index.js"; // Prisma enum import

// 카테고리 매핑 함수
export function toFoodCategory(cat = "", name = "") {
  const norm = (s = "") => String(s).toLowerCase();

  if (hasAny(cat, KR) || hasAny(name, KR)) return FoodCategory.KOREAN;
  if (hasAny(cat, JP) || hasAny(name, JP)) return FoodCategory.JAPANESE;
  if (hasAny(cat, CN) || hasAny(name, CN)) return FoodCategory.CHINESE;
  if (hasAny(cat, WEST) || hasAny(name, WEST)) return FoodCategory.WESTERN;
  if (hasAny(cat, CAFE_DESSERT) || hasAny(name, CAFE_DESSERT))
    return FoodCategory.CAFE;

  // 패스트푸드 전용
  if (
    hasAny(cat, [
      "분식",
      "분식집",
      "패스트푸드",
      "치킨",
      "버거",
      "햄버거",
      "피자",
    ]) ||
    hasAny(name, ["분식", "치킨", "버거", "피자"])
  ) {
    return FoodCategory.FASTFOOD;
  }

  return FoodCategory.ETC;
}

function hasAny(s, arr) {
  const n = norm(s);
  return arr.some((t) => n.includes(norm(t)));
}
