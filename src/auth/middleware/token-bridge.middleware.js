// Authorization: Bearer ... 를 req.cookies.accessToken 으로만 복사
export function tokenBridge(req, res, next) {
  try {
    if (!req?.cookies?.accessToken) {
      const auth = req.headers?.authorization || "";
      if (auth.startsWith("Bearer ")) {
        const t = auth.slice(7);
        req.cookies = req.cookies || {};
        req.cookies.accessToken = t; // 기존 미들웨어가 읽는 이름 그대로
      }
    }
  } catch {}
  next();
}
