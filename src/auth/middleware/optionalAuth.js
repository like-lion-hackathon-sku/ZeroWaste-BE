// 위치: src / auth / middleware / optionalAuth.js
// 인증 로직이 겹치는 문제 해결 코드 - 민호 제작

export function optionalAuth(req, res, next) {
  // 이미 강제 인증 미들웨어를 전역(app.use)으로 넣었다면,
  // 이 라인이 실행되기 전에 req.user가 채워져 있을 것.
  // 토큰이 없으면 그냥 user 없이 통과.
  try {
    // 토큰 파싱 로직이 별도 함수로 있으면 여기서 호출(실패해도 next)
    return next();
  } catch {
    return next();
  }
}
