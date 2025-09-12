// 위치: src/images/dto/response/images.response.dto.js
export const imagesUploadResponseDto = ({ type, fileName, url }) => ({
  type,
  fileName,
  url,
});

export const imagesLoadResponseDto = (data) => {
  return {
    image: data.image,
    mimeType: data.mimeType,
  };
};

// 분석 응답 DTO
export const imagesAnalyzeResponseDto = (data) => data;
