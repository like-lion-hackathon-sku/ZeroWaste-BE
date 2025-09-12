// 위치: src/images/controller/images.controller.js
import { StatusCodes } from "http-status-codes";
import {
  imagesLoadRequestDto,
  imagesAnalyzeRequestDto,
} from "../dto/request/images.request.dto.js";
import { loadImageData, analyzeImageData } from "../service/images.service.js";

export const handleLoadImage = async (req, res, next) => {
  /*
    #swagger.summary = "이미지 로드"
    #swagger.tags = ["Images"]
    #swagger.description = "업로드한 이미지를 로드합니다."
    #swagger.parameters["imageType"] = { in:"path", description:"이미지 타입 (profile, review)", required : true, example: "profile" }
    #swagger.parameters["fileName"] = { in:"path", description:"이미지 파일 이름", required : true, example: "filename.jpeg" }
  */
  try {
    const image = await loadImageData(imagesLoadRequestDto(req.params));
    res
      .writeHead(StatusCodes.OK, { "Content-Type": image.mimeType })
      .end(image.image);
  } catch (e) {
    next(e);
  }
};

export const handleAnalyzeImage = async (req, res, next) => {
  /*
    #swagger.summary = "이미지 잔반 분석"
    #swagger.tags = ["Images"]
    #swagger.description = "업로드된 이미지를 OpenAI로 분석하여 잔반 점수와 한줄평을 반환합니다."
    #swagger.parameters["imageType"] = { in:"path", description:"이미지 타입 (profile, review)", required : true, example: "review" }
    #swagger.parameters["fileName"] = { in:"path", description:"이미지 파일 이름", required : true, example: "meal-123.jpeg" }
    #swagger.responses[200] = {
      description: "분석 성공",
      schema: {
        oneOf: [
          { type: "object", properties: { type: { enum: ["NOT_FOOD"] } } },
          { type: "object", properties: { type: { enum: ["FOOD"] }, score: { type: "integer" }, summary: { type: "string" } } }
        ]
      }
    }
  */
  try {
    const dto = imagesAnalyzeRequestDto(req.params);
    const result = await analyzeImageData(dto);
    return res.status(StatusCodes.OK).json({ ok: true, ...result });
  } catch (e) {
    next(e);
  }
};
