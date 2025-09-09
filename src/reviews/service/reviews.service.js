import {
  findRestaurantByIdRepo,
  findReviewByUserAndRestaurantRepo,
  createReviewRepo,
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

export const createReviewSvc = async ({ userId, restaurantId }) => {
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

  const created = await createReviewRepo({ userId, restaurantId });
  return created;
};
