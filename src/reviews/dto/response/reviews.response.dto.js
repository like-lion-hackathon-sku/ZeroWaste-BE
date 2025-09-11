/**
 * **[Reviews]**
 * **<🧺⬆️ Response DTO>**
 * ***mapReview***
 * '리뷰 생성/수정' 등의 단일 리뷰 응답에서 서비스 레이어가 컨트롤러로 반환할 객체를 매핑하기 위한 DTO
 * @param {Object} review - Prisma에서 조회/생성된 리뷰 객체
 * @returns {Object} - API 응답으로 내려갈 리뷰 데이터
 */
export const mapReview = (review) => {
  return {
    id: review.id,
    reviewId: review.id,
    restaurantId: review.restaurantsId,
    userId: review.userId,
    contents: review.contents,
    score: review.score,
    created_at: review.createdAt,
  };
};

/**
 * **[Reviews]**
 * **<🧺⬆️ Response DTO>**
 * ***mapMyReview***
 * '내 리뷰 목록 조회' 기능에서 서비스 레이어가 컨트롤러로 반환할 리뷰 리스트 원소를 매핑하기 위한 DTO
 * @param {Object} review - Prisma에서 조회된 리뷰 객체 (user relation 포함)
 * @returns {Object} - API 응답으로 내려갈 리뷰 데이터 (닉네임 포함)
 */
export const mapMyReview = (review) => {
  return {
    id: review.id,
    reviewId: review.id,
    restaurantId: review.restaurantsId,
    userId: review.userId,
    nickname: review.user?.nickname,
    contents: review.contents,
    score: review.score,
    created_at: review.createdAt,
  };
};
