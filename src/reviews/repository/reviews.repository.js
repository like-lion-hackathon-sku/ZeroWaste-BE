export const findRestaurantByIdRepo = async (restaurantId) => {
  const restaurant = await prisma.restaurants.findUnique({
    where: {
      id: restaurantId,
    },
  });
  return restaurant;
};

export const findReviewByUserAndRestaurantRepo = async ({
  userId,
  restaurantId,
}) => {
  const review = await prisma.reviews.findFirst({
    where: { userId, restaurantsId: restaurantId },
  });
  return review;
};

export const createReviewRepo = async ({ userId, restaurantId }) => {
  const newReview = await prisma.reviews.create({
    data: {
      userId,
      restaurantsId: restaurantId,
    },
    select: {
      id: true,
      restaurantId: true,
    },
  });
  return newReview;
};
