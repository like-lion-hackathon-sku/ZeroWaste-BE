import { prisma } from "../../db.config.js";

/**
 * **[Profile]**
 * **\<📦 Repository\>**
 * ***countUserStats***
 * 주어진 사용자 ID로 리뷰 수, 즐겨찾기 수, 획득 배지 수를 집계합니다.
 * @param {number} userId
 * @returns {Promise<Object>}
 */
export const countUserStats = async (userId) => {
  const [reviews, favorites, badges] = await Promise.all([
    prisma.reviews.count({ where: { userId } }),
    prisma.favorites.count({ where: { userId } }),
    prisma.acquiredBadges.count({ where: { userId } }),
  ]);
  return { reviews, favorites, badges };
};
/**
 * **[Profile]**
 * **\<📦 Repository\>**
 * ***avgLeftoverRatioByUser***
 * 
 * @param {number} userId
 * @returns {Promise<number|null>}
 */
export const avgLeftoverRatioByUser = async (userId) => {
  const result = await prisma.reviewPhotos.aggregate({
    _avg: {
      leftoverRatio: true,
    },
    where: {
      reviews: {
        userId: userId,
      },
    },
  });
  return result._avg.leftoverRatio;
};
