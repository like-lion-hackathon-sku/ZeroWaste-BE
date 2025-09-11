import { prisma } from "../../db.config.js";

/**
 * **[Reviews]**
 * **<📦 Repository>**
 * ***findRestaurantByIdRepo***
 * 특정 식당 ID로 식당 존재 여부를 조회합니다.
 * @param {number} restaurantId - 조회할 식당 ID
 * @returns {Object|null} - 해당 식당 객체 또는 null
 */
export const findRestaurantByIdRepo = async (restaurantId) => {
  const restaurant = await prisma.restaurants.findUnique({
    where: {
      id: restaurantId,
    },
  });
  return restaurant;
};

/**
 * **[Reviews]**
 * **<🗄️ Repository>**
 * ***findReviewByUserAndRestaurantRepo***
 * 특정 유저가 특정 식당에 작성한 리뷰가 있는지 조회합니다.
 * @param {Object} params
 * @param {number} params.userId - 유저 ID
 * @param {number} params.restaurantId - 식당 ID
 * @returns {Object|null} - 리뷰 객체 또는 null
 */
export const findReviewByUserAndRestaurantRepo = async ({
  userId,
  restaurantId,
}) => {
  const review = await prisma.reviews.findFirst({
    where: { userId, restaurantsId: restaurantId },
  });
  return review;
};
/**
 * **[Reviews]**
 * **<🗄️ Repository>**
 * ***createReviewRepo***
 * 새 리뷰를 생성합니다.
 * @param {Object} params
 * @param {number} params.userId - 작성자 유저 ID
 * @param {number} params.restaurantId - 식당 ID
 * @param {string} params.contents - 리뷰 내용
 * @param {number} [params.score] - 평점 (선택)
 * @returns {Object} - 생성된 리뷰 객체
 */
export const createReviewRepo = async ({
  userId,
  restaurantId,
  contents,
  score,
}) => {
  const newReview = await prisma.reviews.create({
    data: {
      userId,
      restaurantsId: restaurantId,
      contents,
      ...(score !== undefined ? { score } : {}),
    },
    select: {
      id: true,
      userId: true,
      restaurantsId: true,
      contents: true,
      score: true,
      createdAt: true,
    },
  });
  return newReview;
};

/**
 * **[Reviews]**
 * **<🗄️ Repository>**
 * ***findReviewByIdRepo***
 * 리뷰 ID로 단일 리뷰를 조회합니다.
 * @param {number} reviewId - 리뷰 ID
 * @returns {Object|null} - 리뷰 객체 또는 null
 */
export const findReviewByIdRepo = async (reviewId) => {
  return prisma.reviews.findUnique({ where: { id: reviewId } });
};

/**
 * **[Reviews]**
 * **<🗄️ Repository>**
 * ***updateReviewRepo***
 * 특정 리뷰를 수정합니다.
 * @param {Object} params
 * @param {number} params.reviewId - 수정할 리뷰 ID
 * @param {Object} params.data - 수정할 데이터
 * @returns {Object} - 수정된 리뷰 객체
 */
export const updateReviewRepo = async ({ reviewId, data }) => {
  return prisma.reviews.update({
    where: { id: reviewId },
    data,
    select: {
      id: true,
      userId: true,
      restaurantsId: true,
      contents: true,
      score: true,
      createdAt: true,
    },
  });
};

/**
 * **[Reviews]**
 * **<🗄️ Repository>**
 * ***deleteReviewRepo***
 * 특정 리뷰를 삭제합니다.
 * @param {number} reviewId - 삭제할 리뷰 ID
 * @returns {Object} - 삭제된 리뷰 객체
 */
export const deleteReviewRepo = async (reviewId) => {
  return prisma.reviews.delete({
    where: { id: reviewId },
    select: {
      id: true,
      userId: true,
      restaurantsId: true,
      contents: true,
      score: true,
      createdAt: true,
    },
  });
};

/**
 * **[Reviews]**
 * **<🗄️ Repository>**
 * ***listMyReviewsRepo***
 * 특정 유저가 작성한 리뷰 목록을 페이지네이션하여 조회합니다.
 * @param {Object} params
 * @param {number} params.userId - 유저 ID
 * @param {number} params.page - 페이지 번호
 * @param {number} params.size - 페이지 크기
 * @returns {Array<Object>} - 리뷰 목록 배열
 */
export const listMyReviewsRepo = async ({ userId, page, size }) => {
  const skip = (page - 1) * size;
  const reviews = await prisma.reviews.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip,
    take: size,
    include: { user: { select: { nickname: true } } },
  });
  return reviews;
};
