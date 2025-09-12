export function getReqUserId(req) {
  // 우선순위: req.user.id → payload.sub/id/userId
  return (
    req?.user?.id ??
    req?.payload?.sub ??
    req?.payload?.id ??
    req?.payload?.userId ??
    req?.payload?.user_id ??
    null
  );
}
