import {
  listNearby,
  getDetail,
  getNaverExternalDetail,
  syncExternalPlace,
} from "../service/restaurants.service.js";

function ok(res, data, status = 200) {
  return res.status(status).json({ ok: true, ...(
    typeof data === "object" && !Array.isArray(data) ? data : { data }
  ) });
}

export const listNearbyCtrl = async (req, res, next) => {
  try { ok(res, await listNearby(req.query)); } catch (e) { next(e); }
};

export const getDetailCtrl = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await getDetail(id);
    if (!data) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    ok(res, data);
  } catch (e) { next(e); }
};

export const getNaverExternalDetailCtrl = async (req, res, next) => {
  try {
    const { placeId } = req.params;
    const data = await getNaverExternalDetail(placeId);
    ok(res, { data, restaurantId: null });
  } catch (e) { next(e); }
};

export const syncExternalPlaceCtrl = async (req, res, next) => {
  try { ok(res, await syncExternalPlace(req.body)); } catch (e) {
    res.status(e?.status ?? 500).json({ ok: false, error: e?.message ?? "INTERNAL_ERROR" });
  }
};