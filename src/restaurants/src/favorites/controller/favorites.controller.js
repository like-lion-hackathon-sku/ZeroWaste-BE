// 위치: src/favorites/controller/favorites.controller.js
import {
  addFavoriteById,
  addFavoriteByExternalPlace,
  removeFavorite,
  listMyFavorites,
} from "../service/favorites.service.js";

// 즐겨찾기 추가(DB에 식당이 있을때) 컨트롤러
export const addByIdCtrl = async (req, res, next) => {
  try {
    const userId = req.user.id;               // 인증 미들웨어 전제
    const restaurantId = Number(req.params.restaurantId);
    const result = await addFavoriteById(userId, restaurantId);
    return res.status(200).json({ ok: true, ...result });
  } catch (e) { next(e); }
};

// 즐겨찾기 추가(DB에 식당이 없을때) 컨트롤러
export const addByExternalCtrl = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await addFavoriteByExternalPlace(userId, req.body);
    return res.status(200).json({ ok: true, ...result });
  } catch (e) { next(e); }
};

// 즐겨찾기 삭제 컨트롤러
export const removeCtrl = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const restaurantId = Number(req.params.restaurantId);
    await removeFavorite(userId, restaurantId);
    return res.status(200).json({ ok: true });
  } catch (e) { next(e); }
};

// 즐겨찾기 목록 조회 컨트롤러
export const listCtrl = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await listMyFavorites(userId, req.query);
    return res.status(200).json({ ok: true, ...data });
  } catch (e) { next(e); }
};