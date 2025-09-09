export const mapReview = (review) => {
  return {
    id: review.id,
    restaurantId: review.restaurantsId,
    userId: review.userId,
    createdAt: review.createdAt,
  };
};
