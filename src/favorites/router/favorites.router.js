import { Router } from "express";
import {
  listMyFavoritesCtrl,
  upsertFavorite,
  removeFavoriteById,
} from "../controller/favorites.controller.js";
import {
  authenticateAccessToken,
  verifyUserIsActive,
} from "../../auth/middleware/auth.middleware.js";

// ★ 추가: 헤더→쿠키 브릿지
import { tokenBridge } from "../../auth/middleware/token-bridge.middleware.js";

const r = Router();

// ★ 순서 중요: tokenBridge → authenticateAccessToken → verifyUserIsActive
r.use(tokenBridge, authenticateAccessToken, verifyUserIsActive);

r.get("/", listMyFavoritesCtrl);
r.post("/", upsertFavorite);
r.delete("/:restaurantId", removeFavoriteById);

export default r;
