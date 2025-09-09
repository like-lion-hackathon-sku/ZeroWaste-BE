/**
 * **[Auth]**
 * **\<Response DTO\>**
 * ***responseFromSignUp***
 * '프로필 조회' 기능의 요청 결과값을 서비스 레이어에서 컨트롤러로 반환하기 위한 DTO
 * @param {Object} user
 * @param {Object} stats
 * @returns {Object}
 */
export const responseFromGetProfile = (user, stats) => {
  const base = {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    createdAt: user.created_at,
  };
  return {
    ...base,
    stats: {
      reviews: stats.reviews ?? 0,
      favorites: stats.favorites ?? 0,
      badges: stats.badges ?? 0,
      leftoverStars: stats.leftoverStars ?? null,
    },
  };
};

