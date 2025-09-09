// src/reviews/controller/reviews.controller.js
import { parseCreateReviewRequest } from "../dto/request/reviews.request.dto.js";
import { createReviewSvc } from "../service/reviews.service.js";
import { mapReview } from "../dto/response/reviews.response.dto.js";

export const handleCreateReview = async (req, res, next) => {
  try {
    // DTO는 restaurantId만 검증/반환
    const { restaurantId } = parseCreateReviewRequest(req);

    // 인증 미들웨어가 세팅한 사용자
    const userId = req.user?.id;

    const created = await createReviewSvc({ userId, restaurantId });

    return res.status(201).json(mapReview(created));
  } catch (err) {
    return next(err);
  }
};
