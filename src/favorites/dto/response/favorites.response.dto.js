// 즐겨찾기 응답 DTO 스키마들
// 사용 예시(컨트롤러 주석):
//  /* #swagger.responses[200] = { schema: { $ref: '#/components/schemas/ApiEnvelopeSuccess_FavoriteUpsert' } } */
//  /* #swagger.responses[200] = { schema: { $ref: '#/components/schemas/ApiEnvelopeSuccess_FavoriteList' } } */
//  /* #swagger.responses[200] = { schema: { $ref: '#/components/schemas/ApiEnvelopeSuccess_Boolean' } } */
//  /* #swagger.responses[4xx] = { schema: { $ref: '#/components/schemas/ApiEnvelopeFail' } } */
//  /* #swagger.responses[5xx] = { schema: { $ref: '#/components/schemas/ApiEnvelopeFail' } } */

export const FoodCategoryEnum = {
  type: "string",
  description: "내부 FoodCategory ENUM",
  enum: ["KOREAN", "JAPANESE", "CHINESE", "WESTERN", "FASTFOOD", "CAFE", "ETC"],
  example: "KOREAN",
};

export const ApiErrorDto = {
  type: "object",
  properties: {
    code: { type: "string", example: "RESTAURANT_NOT_FOUND" },
    message: {
      type: "string",
      nullable: true,
      example: "해당 식당을 찾을 수 없습니다.",
    },
  },
  required: ["code"],
};

export const FavoriteUpsertResult = {
  type: "object",
  description:
    "즐겨찾기 멱등 추가 결과. created=true면 새로 생성, false면 기존 유지/재할당.",
  properties: {
    restaurantId: { type: "integer", example: 123 },
    created: { type: "boolean", example: true },
    reassignedFrom: {
      type: "integer",
      nullable: true,
      description:
        "동일 상호/주소의 기존 즐겨찾기를 새 restaurantId로 재할당한 경우 원래 ID",
      example: 45,
    },
  },
  required: ["restaurantId", "created"],
};

export const FavoriteListItem = {
  type: "object",
  description: "즐겨찾기 목록의 단일 아이템(식당 정보 요약)",
  properties: {
    restaurantId: { type: "integer", example: 123 },
    name: { type: "string", example: "바람난오리궁뎅이" },
    address: { type: "string", example: "서울특별시 성북구 보국문로29길 15" },
    telephone: { type: "string", nullable: true, example: "02-123-4567" },
    category: FoodCategoryEnum,
    mapx: { type: "integer", nullable: true, example: 1270031250 },
    mapy: { type: "integer", nullable: true, example: 376160570 },
    isSponsored: { type: "boolean", nullable: true, example: false },
    createdAt: {
      type: "string",
      format: "date-time",
      example: "2025-09-11T08:30:00.000Z",
    },
  },
  required: ["restaurantId", "name", "address"],
};

export const FavoriteListResult = {
  type: "object",
  description: "즐겨찾기 목록 응답 데이터",
  properties: {
    page: { type: "integer", example: 1 },
    size: { type: "integer", example: 20 },
    total: { type: "integer", example: 42 },
    items: {
      type: "array",
      items: { $ref: "#/components/schemas/FavoriteListItem" },
    },
  },
  required: ["page", "size", "total", "items"],
};

export const ApiEnvelopeSuccess_FavoriteUpsert = {
  type: "object",
  properties: {
    resultType: { type: "string", enum: ["SUCCESS"], example: "SUCCESS" },
    error: { type: "null", nullable: true, example: null },
    success: { $ref: "#/components/schemas/FavoriteUpsertResult" },
  },
  required: ["resultType", "error", "success"],
};

export const ApiEnvelopeSuccess_FavoriteList = {
  type: "object",
  properties: {
    resultType: { type: "string", enum: ["SUCCESS"], example: "SUCCESS" },
    error: { type: "null", nullable: true, example: null },
    success: { $ref: "#/components/schemas/FavoriteListResult" },
  },
  required: ["resultType", "error", "success"],
};

export const ApiEnvelopeSuccess_Boolean = {
  type: "object",
  description: "성공/실패 여부만 반환하는 성공 응답 (예: 삭제 true)",
  properties: {
    resultType: { type: "string", enum: ["SUCCESS"], example: "SUCCESS" },
    error: { type: "null", nullable: true, example: null },
    success: { type: "boolean", example: true },
  },
  required: ["resultType", "error", "success"],
};

export const ApiEnvelopeFail = {
  type: "object",
  properties: {
    resultType: { type: "string", enum: ["FAIL"], example: "FAIL" },
    error: { $ref: "#/components/schemas/ApiErrorDto" },
    success: { type: "null", nullable: true, example: null },
  },
  required: ["resultType", "error", "success"],
};

// 스웨거 컴포넌트 병합용 내보내기
export const FavoritesResponseSchemas = {
  FoodCategoryEnum,
  ApiErrorDto,
  FavoriteUpsertResult,
  FavoriteListItem,
  FavoriteListResult,
  ApiEnvelopeSuccess_FavoriteUpsert,
  ApiEnvelopeSuccess_FavoriteList,
  ApiEnvelopeSuccess_Boolean,
  ApiEnvelopeFail,
};

export default FavoritesResponseSchemas;
