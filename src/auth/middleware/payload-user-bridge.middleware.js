// req.payload → req.user 로 표준화
export function payloadUserBridge(req, res, next) {
  try {
    if (req.payload && !req.user) {
      const p = req.payload;

      // id 후보들을 한 번에 커버: sub | id | userId
      const id = p.sub ?? p.id ?? p.userId ?? p.user_id ?? p.uid ?? null;

      req.user = {
        id, // 컨트롤러에서 req.user.id 로 통일 사용
        ...p, // 필요 시 추가 필드 사용 가능 (role, email 등)
      };
    }
  } catch (_) {
    // 무시하고 다음으로
  }
  next();
}
