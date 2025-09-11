// 즐겨찾기 요청 DTO 스키마들
// 사용 예시(컨트롤러 주석):
//  /* #swagger.parameters['body'] = { in: 'body', schema: { $ref: '#/components/schemas/FavoriteUpsertBody' } } */
//  /* #swagger.parameters['query'] = { in: 'query', schema: { $ref: '#/components/schemas/FavoritesListQuery' } } */
//  /* #swagger.parameters['path'] = { in: 'path', schema: { $ref: '#/components/schemas/FavoritePathParams' } } */

export const FavoritePlacePayload = {
  type: "object",
  description:
    "외부(네이버 등) place payload. restaurantId 미제공 시 place로 내부 식당 동기화 후 즐겨찾기 생성.",
  properties: {
    name: { type: "string", example: "바람난오리궁뎅이" },
    address: { type: "string", example: "서울특별시 성북구 보국문로29길 15" },
    telephone: { type: "string", nullable: true, example: "02-123-4567" },
    category: {
      type: "string",
      description: "원본 카테고리 문자열(내부 ENUM 매핑은 서버에서 처리)",
      example: "한식",
    },
    mapx: { type: "integer", nullable: true, example: 1270031250 },
    mapy: { type: "integer", nullable: true, example: 376160570 },
    // 필요한 필드가 더 있다면 자유롭게 확장
  },
  required: ["name", "address"],
};

export const FavoriteUpsertBody = {
  type: "object",
  description:
    "즐겨찾기 추가/멱등(Upsert). restaurantId 또는 place 중 하나는 필수.",
  oneOf: [{ required: ["restaurantId"] }, { required: ["place"] }],
  properties: {
    restaurantId: { type: "integer", example: 123 },
    place: { $ref: "#/components/schemas/FavoritePlacePayload" },
  },
};

export const FavoritesListQuery = {
  type: "object",
  description: "즐겨찾기 목록 조회 쿼리",
  properties: {
    page: { type: "integer", minimum: 1, default: 1, example: 1 },
    size: {
      type: "integer",
      minimum: 1,
      maximum: 100,
      default: 20,
      example: 20,
    },
  },
};

export const FavoritePathParams = {
  type: "object",
  description: "즐겨찾기 삭제 Path 파라미터",
  properties: {
    restaurantId: { type: "integer", minimum: 1, example: 123 },
  },
  required: ["restaurantId"],
};

// 스웨거 컴포넌트 병합용 내보내기
export const FavoritesRequestSchemas = {
  FavoritePlacePayload,
  FavoriteUpsertBody,
  FavoritesListQuery,
  FavoritePathParams,
};

export default FavoritesRequestSchemas;
