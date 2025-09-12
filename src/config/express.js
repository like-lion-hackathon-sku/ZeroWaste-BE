// src/config/express.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { commonResponse } from "../utils/response.js";

export const setupExpress = () => {
  const app = express();

  // CORS: FE 도메인만 허용 + 쿠키 전송 허용
  const allowedOrigins = [
    "https://zerowaste-fe.netlify.app",
    "http://localhost:5173",
  ];
  const corsOptions = {
    origin: (origin, cb) => {
      // 모바일앱/서버-서버 호출 등 origin이 없을 수도 있음 → 허용
      if (!origin) return cb(null, true);
      return allowedOrigins.includes(origin)
        ? cb(null, true)
        : cb(new Error("CORS_NOT_ALLOWED"), false);
    },
    credentials: true, // ★ 쿠키 전송 허용
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions)); // ★ Preflight

  // HTTPS 프록시 뒤에서 secure 쿠키 사용 시 권장
  app.set("trust proxy", 1);

  app.use(express.static("public"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser()); // 쿠키 파서 먼저
  app.use(commonResponse); // 공통 응답 헬퍼
  return app;
};

export const setupCommonError = (app) => {
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    res.status(err.statusCode || err.status || 500).error({
      errorCode: err.errorCode || "unknown",
      reason: err.reason || err.message || null,
      data: err.data || null,
    });
  });
};
