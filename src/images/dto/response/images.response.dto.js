// 위치: src/images/dto/response/images.response.dto.js
export const imagesLoadResponseDto = (data) => {
  return {
    image: data.image,
    mimeType: data.mimeType,
  };
};

// 분석 응답 DTO: 항상 하나만 반환 (NOT_FOOD 또는 {score, summary})
export const imagesAnalyzeResponseDto = (data) => {
  // data.type === 'NOT_FOOD' 이면 { type: 'NOT_FOOD' }
  // data.type === 'FOOD' 이면 { type: 'FOOD', score, summary }
  return data;
};
