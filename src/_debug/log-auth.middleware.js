export function logAuth(req, res, next) {
  const hasAuth = req.headers?.authorization ? "yes" : "no";
  const hasAT = req?.cookies?.accessToken ? "yes" : "no";
  const hasRT = req?.cookies?.refreshToken ? "yes" : "no";
  console.log(
    `[AUTH] ${req.method} ${req.originalUrl} auth=${hasAuth} cookies: access=${hasAT} refresh=${hasRT}`,
  );
  next();
}
