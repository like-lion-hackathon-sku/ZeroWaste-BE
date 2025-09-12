// 위치: src/images/router/images.router.js
import express from "express";
import multer from "multer";
import {
  handleLoadImage,
  handleAnalyzeImage,
  handleUploadImage,
} from "../controller/images.controller.js";

const router = express.Router({ mergeParams: true });

/* 멀티파트 업로드: 메모리 저장(서비스에서 검증/저장) */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// 업로드 (multipart/form-data; field = "file")
router.post("/:imageType/upload", upload.single("file"), handleUploadImage);

// 이미지 바이트 반환
router.get("/:imageType/:fileName", handleLoadImage);

// 잔반 분석(JSON)
router.post("/:imageType/:fileName/analyze", handleAnalyzeImage);

export default router;
