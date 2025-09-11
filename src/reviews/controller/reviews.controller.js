// src/reviews/controller/reviews.controller.js
import {
  parseCreateReviewRequest,
  parseUpdateMyReviews,
  parseDeleteMyReviews,
  parseGetMyReviews,
} from "../dto/request/reviews.request.dto.js";
import {
  createReviewSvc,
  updateReviewSvc,
  deleteReviewSvc,
  listMyReviewsSvc,
} from "../service/reviews.service.js";
import {
  mapMyReview,
  mapReview,
} from "../dto/response/reviews.response.dto.js";

/**
 * **[Review]**
 *  **\<🕹️ Controller\>**
 *  ***handleCreateReview ***
 *  '리뷰 등록' 기능 담당 API의 컨트롤러
 */
export const handleCreateReviews = async (req, res, next) => {
  /*
  #swagger.summary = '리뷰 생성'
  #swagger.description = '특정 식당에 새로운 리뷰를 작성합니다.'
  #swagger.tags = ['Reviews']
  #swagger.requestBody = {
    required : true,
    content:{
      "application/json":{
        schema:{
          type:"object",
          properties:{
            contents:{ type:"string", example:"정말 맛있었어요!" },
            score:{ type:"number", example:4.5 }
          },
          required:["contents"]
        }
      }
    }
  }
  #swagger.responses[201] = {
    description: '리뷰 작성 성공',
    content:{
      "application/json":{
        schema:{
          type:"object",
          properties:{
            id:{ type:"number", example:1 },
            restaurantId:{ type:"number", example:10 },
            userId:{ type:"number", example:5 },
            contents:{ type:"string", example:"정말 맛있었어요!" },
            score:{ type:"number", example:4.5 },
            createdAt:{ type:"string", example:"2025-09-11T04:12:34.000Z" }
          }
        }
      }
    }
  }
  #swagger.responses[400] = { description: '올바르지 않은 입력 값' }
  #swagger.responses[404] = { description: '식당을 찾을 수 없음' }
  #swagger.responses[409] = { description: '이미 작성한 리뷰가 존재함' }
*/

  try {
    // DTO는 restaurantId만 검증/반환
    const { restaurantId, contents, score } = parseCreateReviewRequest(req);

    // 인증 미들웨어가 세팅한 사용자
    const userId = req.user?.id ?? req.payload?.userId ?? req.payload?.id;

    const created = await createReviewSvc({
      userId,
      restaurantId,
      contents,
      score,
    });

    return res.status(201).json(mapReview(created));
  } catch (err) {
    return next(err);
  }
};

/**
 * **[Review]**
 *  **\<🕹️ Controller\>**
 *  ***handleUpdateReviews***
 *  '리뷰 수정' 기능 담당 API의 컨트롤러
 */
export const handleUpdateReviews = async (req, res, next) => {
  /*
  #swagger.summary = '리뷰 수정'
  #swagger.description = '내가 작성한 특정 리뷰를 수정합니다.'
  #swagger.tags = ['Reviews']
  #swagger.requestBody = {
    required : true,
    content:{
      "application/json":{
        schema:{
          type:"object",
          properties:{
            contents:{ type:"string", example:"맛은 평범했어요." },
            score:{ type:"number", example:3 }
          },
          required:["contents"]
        }
      }
    }
  }
  #swagger.responses[200] = {
    description: '리뷰 수정 성공',
    content:{
      "application/json":{
        schema:{
          type:"object",
          properties:{
            id:{ type:"number", example:1 },
            restaurantId:{ type:"number", example:10 },
            userId:{ type:"number", example:5 },
            contents:{ type:"string", example:"맛은 평범했어요." },
            score:{ type:"number", example:3 },
            createdAt:{ type:"string", example:"2025-09-11T04:12:34.000Z" }
          }
        }
      }
    }
  }
  #swagger.responses[400] = { description: '올바르지 않은 입력 값' }
  #swagger.responses[403] = { description: '본인 리뷰가 아님' }
  #swagger.responses[404] = { description: '리뷰를 찾을 수 없음' }
*/

  try {
    const { reviewId, contents, score } = parseUpdateMyReviews(req);

    const userId = req.user?.id ?? req.payload?.userId ?? req.payload?.id;

    const updated = await updateReviewSvc({
      userId,
      reviewId,
      contents,
      score,
    });

    return res.status(200).json(mapReview(updated));
  } catch (err) {
    return next(err);
  }
};

/**
 * **[Review]**
 *  **\<🕹️ Controller\>**
 *  ***handleDeleteReviews***
 *  '리뷰 삭제' 기능 담당 API의 컨트롤러
 */
export const handleDeleteReviews = async (req, res, next) => {
  /*
  #swagger.summary = '리뷰 삭제'
  #swagger.description = '내가 작성한 특정 리뷰를 삭제합니다.'
  #swagger.tags = ['Reviews']
  #swagger.responses[204] = { description: '리뷰 삭제 성공 (No Content)' }
  #swagger.responses[403] = { description: '본인 리뷰가 아님' }
  #swagger.responses[404] = { description: '리뷰를 찾을 수 없음' }
*/

  try {
    const { reviewId } = parseDeleteMyReviews(req);

    const userId = req.user?.id ?? req.payload?.userId ?? req.payload?.id;

    await deleteReviewSvc({ userId, reviewId });

    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
};

/**
 * **[Review]**
 *  **\<🕹️ Controller\>**
 *  ***handleGetMyReviews***
 *  '내 리뷰 목록 조회' 기능 담당 API의 컨트롤러
 */
export const handleGetMyReviews = async (req, res, next) => {
  /*
  #swagger.summary = '내 리뷰 목록 조회'
  #swagger.description = '로그인한 사용자가 작성한 리뷰 목록을 조회합니다.'
  #swagger.tags = ['Reviews']
  #swagger.responses[200] = {
    description: '내 리뷰 목록 조회 성공',
    content:{
      "application/json":{
        schema:{
          type:"array",
          items:{
            type:"object",
            properties:{
              id:{ type:"number", example:1 },
              restaurantId:{ type:"number", example:10 },
              userId:{ type:"number", example:5 },
              nickname:{ type:"string", example:"현준" },
              contents:{ type:"string", example:"맛있었어요." },
              score:{ type:"number", example:4.5 },
              createdAt:{ type:"string", example:"2025-09-11T04:12:34.000Z" }
            }
          }
        }
      }
    }
  }
*/

  try {
    const { page, size } = parseGetMyReviews(req);

    const userId = req.user?.id ?? req.payload?.userId ?? req.payload?.id;

    const reviews = await listMyReviewsSvc({ userId, page, size });

    return res.status(200).json(reviews.map(mapMyReview));
  } catch (err) {
    return next(err);
  }
};
