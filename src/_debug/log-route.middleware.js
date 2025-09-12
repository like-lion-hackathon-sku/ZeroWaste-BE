// src/_debug/log-route.middleware.js
export function logRoute(req, res, next) {
  console.log("[ROUTE]", req.method, req.originalUrl);
  next();
}
