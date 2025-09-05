import * as repo from "../repository/restaurants.repository.js";

/** 숫자 변환 헬퍼 */
const toInt = (v, def = 0) => {
  const n = parseInt(String(v ?? "").trim(), 10); return Number.isFinite(n) ? n : def;
};

/** 전화번호 정규화(숫자만) */
export function normalizeTel(tel) {
  if (!tel) return null;
  const d = String(tel).replace(/[^\d]/g, "");
  return d.length ? d : null;
}

/** 서울 위도 기준 미터→micro-degree 근사 */
function metersToMicroDegX(m) {
  const meterPerDeg = 111320 * Math.cos(37.5 * Math.PI / 180);
  return Math.round((m / meterPerDeg) * 1_000_000);
}
function metersToMicroDegY(m) {
  const meterPerDeg = 110540;
  return Math.round((m / meterPerDeg) * 1_000_000);
}

/** bbox 파서: 'left,bottom,right,top' */
function parseBBox(str) {
  const [l,b,r,t] = String(str ?? "").split(",").map(s => toInt(s));
  if (![l,b,r,t].every(Number.isFinite) || l>=r || b>=t) return null;
  return { left:l, bottom:b, right:r, top:t };
}

/** 목록 */
export async function listNearby(q) {
  const bbox = parseBBox(q?.bbox);
  if (!bbox) { const e = new Error("INVALID_BBOX"); e.status = 400; throw e; }
  const limit = Math.min(Math.max(toInt(q?.limit, 20), 1), 50);
  const cursor = toInt(q?.cursor, 0);
  return repo.findManyInBBox(bbox, { limit, cursor });
}

/** 상세 */
export async function getDetail(id) {
  if (!Number.isInteger(id) || id <= 0) return null;
  return repo.findById(id);
}

/** 네이버 place 프록시 */
export async function getNaverExternalDetail(placeId) {
  const data = await repo.fetchNaverPlaceDetail(placeId);
  const tel = normalizeTel(data?.telephone ?? data?.tel ?? null);
  return {
    placeId,
    name: data?.name ?? null,
    category: data?.category ?? null,
    address: data?.address ?? data?.roadAddress ?? null,
    telephone: tel,
    mapx: toInt(data?.mapx),
    mapy: toInt(data?.mapy),
    photos: Array.isArray(data?.photos) ? data.photos : [],
  };
}

/** 외부 place → DB 동기화(멱등) */
export async function syncExternalPlace(payload) {
  const name = String(payload?.name ?? "").trim();
  const address = String(payload?.address ?? "").trim();
  const category = payload?.category ? String(payload.category) : null;
  const mapx = toInt(payload?.mapx);
  const mapy = toInt(payload?.mapy);
  const is_sponsored = !!payload?.is_sponsored;
  const telephoneNorm = normalizeTel(payload?.telephone);

  if (!name || !address || !Number.isInteger(mapx) || !Number.isInteger(mapy)) {
    const err = new Error("INVALID_PAYLOAD"); err.status = 400; throw err;
  }

  // 1) 전화번호 일치
  if (telephoneNorm) {
    const byTel = await repo.findByTelephone(telephoneNorm);
    if (byTel) return { restaurantId: byTel.id, created: false };
  }
  // 2) 좌표 근접(50m)
  const dx = metersToMicroDegX(50), dy = metersToMicroDegY(50);
  const near = await repo.findNearestByMicroDeg(mapx, mapy, { dx, dy });
  if (near) return { restaurantId: near.id, created: false };

  // 3) 생성
  const created = await repo.createFromExternal({
    name, category, address, telephone: telephoneNorm, mapx, mapy, is_sponsored,
  });
  return { restaurantId: created.id, created: true };
}