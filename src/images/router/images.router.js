// 위치: src/images/router/images.router.js
import express from "express";
import {
  handleLoadImage,
  handleAnalyzeImage,
} from "../controller/images.controller.js";

const router = express.Router({ mergeParams: true });

// 이미지 바이트 반환
router.get("/:imageType/:fileName", handleLoadImage);

// 잔반 분석(JSON)
router.post("/:imageType/:fileName/analyze", handleAnalyzeImage);

export default router;
