import { InvalidInputValueError } from "../../../error.js";

/**
 * **[Review]**
 * **\<🧺⬇️ Request DTO\>**
 * ***parseCreateReviewRequest***
 * '리뷰 생성' 기능의 요청 값을 서비스 레이어로 옮기기 위한 DTO 파서 함수
 * 클라이언트로부터 받은 요청(req)을 기반으로 필요한 데이터를 추출하고,
 * 유효성 검사를 수행한 뒤 정제된 데이터를 반환합니다.
 *
 * @param {Object} req - HTTP 요청 객체 (Request Object)
 * @returns {Object} - 유효성 검사를 통과한 리뷰 데이터 객체
 * @throws {InvalidInputValueError} - 유효하지 않은 입력 값이 있을 경우
 */
export const parseCreateReviewRequest = (req) => {
  const restaurantId = Number(req.params.id);
  const { score, contents } = req.body ?? {};

  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    throw new InvalidInputValueError(
      "restuarantId가 올바르지 않습니다.",
      req.params
    );
  }
  if (
    typeof contents !== "string" ||
    contents.length < 1 ||
    contents.length > 1000
  ) {
    throw new InvalidInputValueError(
      "contents는 1~1000자여야 합니다.",
      req.body
    );
  }

  let normScore = undefined;
  if (score !== undefined) {
    const s = Number(score);
    if (!Number.isFinite(s) || s < 0 || s > 5) {
      throw new InvalidInputValueError(
        "score는 1~5점 사이여야 합니다.",
        req.body
      );
    }
    normScore = s;
  }

  return { restaurantId, contents, score: normScore };
};

/**
 * **[Review]**
 * **\<🧺⬇️ Request DTO\>**
 * ***parseUpdateMyReviews***
 * '리뷰 수정' 기능의 요청 값을 서비스 레이어로 전달하기 위한 DTO 파서 함수
 * 요청 객체(req)에서 리뷰 ID와 수정 내용을 추출하고,
 * 각 값에 대한 유효성 검사를 수행한 뒤 정제된 데이터를 반환합니다.
 *
 * @param {Object} req - HTTP 요청 객체 (Request Object)
 * @returns {Object} - 유효성 검사를 통과한 리뷰 수정 데이터 객체
 * @throws {InvalidInputValueError} - 유효하지 않은 입력 값이 있을 경우
 */
export const parseUpdateMyReviews = (req) => {
  const reviewId = Number(req.params.reviewId ?? req.params.id);
  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    throw new InvalidInputValueError(
      "reviewId가 올바르지 않습니다.",
      req.params
    );
  }

  const { contents, score } = req.body ?? {};
  if (
    typeof contents !== "string" ||
    contents.length < 1 ||
    contents.length > 1000
  ) {
    throw new InvalidInputValueError(
      "contents는 1~1000자여야 합니다.",
      req.body
    );
  }
  let normScore = undefined;
  if (score !== undefined) {
    const s = Number(score);
    if (!Number.isFinite(s) || s < 0 || s > 5) {
      throw new InvalidInputValueError("score은 0~5점이여야 합니다.", req.body);
    }
    normScore = s;
  }

  return { reviewId, contents, score: normScore };
};

/**
 * **[Review]**
 * **\<🧺⬇️ Request DTO\>**
 * ***parseDeleteMyReviews***
 * '리뷰 삭제' 기능의 요청 값을 서비스 레이어로 전달하기 위한 DTO 파서 함수
 * 요청 객체(req)에서 리뷰 ID를 추출하고,
 * 유효성 검사를 수행한 뒤 정제된 데이터를 반환합니다.
 *
 * @param {Object} req - HTTP 요청 객체 (Request Object)
 * @returns {Object} - 유효성 검사를 통과한 리뷰 삭제 데이터 객체
 * @throws {InvalidInputValueError} - 유효하지 않은 입력 값이 있을 경우
 */
export const parseDeleteMyReviews = (req) => {
  const reviewId = Number(req.params.reviewId ?? req.params.id);
  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    throw new InvalidInputValueError(
      "reviewId가 올바르지 않습니다.",
      req.params
    );
  }
  return { reviewId };
};

/**
 * **[Review]**
 * **\<🧺⬇️ Request DTO\>**
 * ***parseGetMyReviews***
 * '내 리뷰 목록 조회' 기능의 요청 값을 서비스 레이어로 전달하기 위한 DTO 파서 함수
 * 요청 쿼리에서 페이지 번호와 페이지 당 항목 수를 추출하고,
 * 유효성 검사와 기본값 설정을 통해 정제된 데이터를 반환합니다.
 *
 * @param {Object} req - HTTP 요청 객체 (Request Object)
 * @returns {Object} - 유효성 검사를 통과한 페이지네이션 데이터 객체
 */
export const parseGetMyReviews = (req) => {
  const { page = "1", size = "10" } = req.query ?? {};
  const p = Math.max(1, Number(page) || 1);
  const s = Math.min(50, Math.max(1, Number(size) || 10));

  return { page: p, size: s };
};
