import {
  findRestaurantByIdRepo,
  findReviewByUserAndRestaurantRepo,
  createReviewRepo,
  findReviewByIdRepo,
  updateReviewRepo,
  deleteReviewRepo,
  listMyReviewsRepo,
} from "../repository/reviews.repository.js";

/**
 * **\<💥 Error\>** *
 * ***RestaurantNotFoundError*** *
 * 식당을 찾을 수 없을 때 발생하는 에러
 */
class RestaurantNotFoundError extends Error {
  constructor(message = "식당을 찾을 수 없습니다.", meta = {}) {
    super(message);
    this.name = "RestaurantNotFoundError";
    this.statusCode = 404;
    this.meta = meta;
  }
}

/**
 * **\<💥 Error\>** *
 * ***ReviewNotFoundError*** *
 * 리뷰를 찾을 수 없을 때 발생하는 에러
 */
class ReviewNotFoundError extends Error {
  constructor(message = "리뷰를 찾을 수 없습니다.", meta = {}) {
    super(message);
    this.name = "ReviewNotFoundError";
    this.statusCode = 404;
    this.meta = meta;
  }
}

/**
 * **\<💥 Error\>** *
 * ***ForbiddenReviewEditError*** *
 * 다른 사람 리뷰 수정 금지 (본인 리뷰만 수정 가능)
 */
class ForbiddenReviewEditError extends Error {
  constructor(message = "본인 리뷰만 수정할 수 있습니다.", meta = {}) {
    super(message);
    this.name = "ForbiddenReviewEditError";
    this.statusCode = 403;
    this.meta = meta;
  }
}

export const createReviewSvc = async ({
  userId,
  restaurantId,
  contents,
  score,
}) => {
  const restaurant = await findRestaurantByIdRepo(restaurantId);
  if (!restaurant) {
    throw new RestaurantNotFoundError("식당을 찾을 수 없습니다.", {
      restaurantId,
    });
  }

  const dup = await findReviewByUserAndRestaurantRepo({ userId, restaurantId });
  if (dup) {
    throw Object.assign(new Error("이미 이 식당에 작성한 리뷰가 있습니다."), {
      name: "ReviewAlreadyExistsError",
      statusCode: 409,
      meta: { userId, restaurantId },
    });
  }
  const created = await createReviewRepo({
    userId,
    restaurantId,
    contents,
    score,
  });
  return created;
};

export const updateReviewSvc = async ({
  userId,
  reviewId,
  score,
  contents,
}) => {
  const review = await findReviewByIdRepo(reviewId);
  if (!review) {
    throw new ReviewNotFoundError(undefined, { reviewId });
  }
  if (review.userId !== userId) {
    throw new ForbiddenReviewEditError(undefined, {
      userId,
      reviewUserId: review.userId,
    });
  }
  const data = {
    ...(typeof contents === "string" ? { contents } : {}),
    ...(score !== undefined ? { score } : {}),
  };
  const updated = await updateReviewRepo({ reviewId, data });
  return updated;
};

export const deleteReviewSvc = async ({ userId, reviewId }) => {
  const review = await findReviewByIdRepo(reviewId);
  if (!review) {
    throw new ReviewNotFoundError(undefined, { reviewId });
  }

  if (review.userId !== userId) {
    throw new ForbiddenReviewEditError(undefined, {
      userId,
      reviewUserId: review.userId,
    });
  }
  const deleted = await deleteReviewRepo(reviewId);
  return deleted;
};

export const listMyReviewsSvc = async ({ userId, page, size }) => {
  const reviews = await listMyReviewsRepo({ userId, page, size });

  return reviews;
};
