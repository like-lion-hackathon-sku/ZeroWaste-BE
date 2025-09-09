import { InvalidInputValueError } from "../../../error";

export const parseCreateReviewRequest = (req) => {
  const restaurantId = Number(req.params.id);

  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    throw new InvalidInputValueError(
      "restuarantId가 올바르지 않습니다.",
      req.params
    );
  }
};
