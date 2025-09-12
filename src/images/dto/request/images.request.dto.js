// 위치: src/images/dto/request/images.request.dto.js
export const imagesUploadRequestDto = ({ params, file }) => {
  return {
    type: params.imageType,
    originalName: file?.originalname,
    mimeType: file?.mimetype,
    buffer: file?.buffer,
    size: file?.size,
  };
};

export const imagesLoadRequestDto = (params) => {
  return {
    type: params.imageType,
    name: params.fileName,
  };
};

// 분석 요청 DTO (필요 시 추가 파라미터 확장 가능)
export const imagesAnalyzeRequestDto = (params) => {
  return {
    type: params.imageType,
    name: params.fileName,
  };
};
