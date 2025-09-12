// 헤더 Authorization: Bearer ... 를 쿠키 accessToken 으로 브릿지
export function tokenBridge(req, res, next) {
  try {
    // 이미 쿠키에 있으면 건드리지 않음 (기존 로직 존중)
    if (!req?.cookies?.accessToken) {
      const auth = req.headers?.authorization || "";
      if (auth.startsWith("Bearer ")) {
        const token = auth.slice(7);
        // req.cookies 객체가 없을 수도 있으니 안전하게
        req.cookies = req.cookies || {};
        req.cookies.accessToken = token; // ★ 기존 미들웨어가 읽는 이름 그대로
      }
    }
  } catch (_) {
    // 브릿지는 실패해도 인증 미들웨어가 판단하므로 그냥 넘김
  }
  next();
}
