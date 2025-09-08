// 위치: src/restaurants/service/naver.service.js
import "dotenv/config";
import axios from "axios";

/* ========================= 기본 설정/로그 ========================= */
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID ?? "";
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET ?? "";

const dlog = (...args) => {
  if (process.env.DEBUG_NAVER === "1") console.log(...args);
};

/* ========================= 유틸 ========================= */
function stripTags(s = "") {
  return String(s).replace(/<[^>]*>/g, "");
}
function toNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function normalizeName(s = "") {
  return String(s).replace(/\s+/g, " ").trim();
}
function isNaverPlaceLink(url = "") {
  try {
    const host = new URL(url).host.toLowerCase();
    return (
      host === "pcmap.place.naver.com" ||
      host === "place.naver.com" ||
      host === "m.place.naver.com" ||
      host === "map.place.naver.com"
    );
  } catch {
    return false;
  }
}

/** URL/쿼리/본문에서 placeId 추출 (짧은 버전) */
function extractPlaceIdFromUrl(url = "") {
  if (!url) return null;
  try {
    const u = new URL(url);
    for (const key of ["placeId", "poiId", "id", "code"]) {
      const v = u.searchParams.get(key);
      if (v && /^\d{4,}$/.test(v)) return v;
    }
  } catch {}
  const m =
    String(url).match(
      /(?:entry\/place|restaurant|place)\/(\d{4,})(?=[/?#\s"']|$)/,
    ) || String(url).match(/(?:placeId|poiId|id|code)=(\d{4,})/);
  return m ? m[1] : null;
}

function extractPlaceIdFromHtml(html = "") {
  const s = String(html);
  let m =
    s.match(
      /<link[^>]+rel=["']canonical["'][^>]+href=["'][^"']*(?:restaurant|place)\/(\d{4,})/i,
    ) ||
    s.match(
      /<meta[^>]+property=["']og:url["'][^>]+content=["'][^"']*(?:restaurant|place)\/(\d{4,})/i,
    );
  if (m) return m[1];

  const next = s.match(/id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
  if (next) {
    try {
      const str = next[1];
      const id =
        str.match(/(?:restaurant|place)\/(\d{4,})/) ||
        str.match(/"placeId"\s*:\s*"(\d{4,})"/) ||
        str.match(/"poiId"\s*:\s*(\d{4,})/);
      if (id) return id[1];
    } catch {}
  }

  const ap = s.match(/window\.__APOLLO_STATE__\s*=\s*(.*?);\s*<\/script>/s);
  if (ap) {
    try {
      const str = ap[1];
      const id =
        str.match(/(?:restaurant|place)\/(\d{4,})/) ||
        str.match(/"placeId"\s*:\s*"(\d{4,})"/) ||
        str.match(/"poiId"\s*:\s*(\d{4,})/);
      if (id) return id[1];
    } catch {}
  }

  const fromBody =
    s.match(
      /https?:\/\/(?:pcmap|map)\.place\.naver\.com\/(?:restaurant|place)\/(\d{4,})/,
    ) ||
    s.match(/(?:entry\/place|restaurant|place)\/(\d{4,})(?=[/?#\s"'])/) ||
    s.match(/(?:placeId|poiId|id|code)=(\d{4,})/);
  return fromBody ? fromBody[1] : null;
}

/* ========================= 네이버 로컬 검색 ========================= */
export async function searchLocal(query, display = 10) {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    const err = new Error("NAVER_API_KEYS_MISSING");
    err.status = 500;
    throw err;
  }

  const url = "https://openapi.naver.com/v1/search/local.json";
  const res = await axios.get(url, {
    params: { query, display },
    headers: {
      "X-Naver-Client-Id": NAVER_CLIENT_ID,
      "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
    },
    timeout: 7000,
    validateStatus: (s) => s >= 200 && s < 500,
  });

  dlog("[NAVER][LOCAL-RES]", {
    status: res.status,
    len: res.data?.items?.length ?? 0,
    errorMessage: res.data?.errorMessage ?? res.data?.message ?? null,
  });

  if (res.status >= 400) {
    const err = new Error(`NAVER_LOCAL_SEARCH_FAILED(${res.status})`);
    err.status = res.status;
    err.data = res.data;
    throw err;
  }

  return (res.data?.items ?? []).map((item) => ({
    name: stripTags(item.title),
    category: item.category ?? "",
    address: item.roadAddress || item.address || "",
    telephone: item.telephone || "",
    mapx: toNumberOrNull(item.mapx),
    mapy: toNumberOrNull(item.mapy),
    link: item.link ?? "",
  }));
}

/* ============ placeId 탐색 ============ */
/** 링크를 실제로 열어 최종 URL/HTML에서 placeId 추출 (간소화) */
async function resolvePlaceIdFromLink(link) {
  if (!link) return null;
  const opts = {
    timeout: 8000,
    maxRedirects: 5,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36",
      "Accept-Language": "ko-KR,ko;q=0.9",
      Referer: "https://map.naver.com/",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    validateStatus: (s) => (s >= 200 && s < 400) || s === 404,
  };

  try {
    // HEAD로 최종 URL만 확인
    try {
      const h = await axios.head(link, opts);
      const final1 = h?.request?.res?.responseUrl ?? h?.request?.path ?? link;
      const id1 = extractPlaceIdFromUrl(final1);
      if (id1) return id1;
    } catch {}

    // GET으로 HTML 수집 → 본문/최종URL에서 재시도
    const r = await axios.get(link, opts);
    const finalUrl = r?.request?.res?.responseUrl ?? r?.request?.path ?? link;
    let id = extractPlaceIdFromUrl(finalUrl);
    if (id) return id;

    id = extractPlaceIdFromHtml(String(r.data || ""));
    if (id) return id;
  } catch {}
  return null;
}

/** Local API로 2회만 시도: "이름 주소", "이름" */
async function findPlaceIdByLocalApi(name, address) {
  const url = "https://openapi.naver.com/v1/search/local.json";
  const headers = {
    "X-Naver-Client-Id": NAVER_CLIENT_ID,
    "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
  };
  const qList = [
    [normalizeName(name), normalizeName(address)].filter(Boolean).join(" "),
    normalizeName(name),
  ].filter(Boolean);

  for (const q of qList) {
    const r = await axios.get(url, {
      params: { query: q, display: 10 },
      headers,
      timeout: 7000,
      validateStatus: (s) => s >= 200 && s < 500,
    });
    if (r.status >= 400) continue;

    for (const item of r.data?.items ?? []) {
      const link = item.link || "";
      if (!isNaverPlaceLink(link)) continue;
      let id = extractPlaceIdFromUrl(link);
      if (!id) id = await resolvePlaceIdFromLink(link);
      if (id) {
        dlog("[NAVER][PLACE-ID-HIT]", { q, id });
        return {
          id,
          fixedName: stripTags(item.title),
          fixedAddr: item.roadAddress || item.address || "",
        };
      }
    }
  }
  return null;
}

/** WebKR으로 1회만 시도: site:pcmap.place.naver.com "이름" "주소" */
async function findPlaceIdByWebSearch(name, address) {
  const headers = {
    "X-Naver-Client-Id": NAVER_CLIENT_ID,
    "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
  };
  const nm = normalizeName(name);
  const ad = normalizeName(address);
  if (!nm) return null;

  const q = ["site:pcmap.place.naver.com", `"${nm}"`, ad ? `"${ad}"` : ""]
    .filter(Boolean)
    .join(" ");

  try {
    const r = await axios.get(
      "https://openapi.naver.com/v1/search/webkr.json",
      {
        params: { query: q, display: 5 },
        headers,
        timeout: 7000,
        validateStatus: (s) => s >= 200 && s < 500,
      },
    );
    dlog("[NAVER][WEBKR-STATUS]", {
      q,
      status: r.status,
      len: r.data?.items?.length ?? 0,
    });
    if (r.status >= 400) return null;

    for (const it of r.data?.items ?? []) {
      const cand = it.link || it.url || it.description || it.title || "";
      const id =
        extractPlaceIdFromUrl(cand) || extractPlaceIdFromUrl(stripTags(cand));
      if (id) return { id };
    }
  } catch {}
  return null;
}

/* ========================= 외부 상세(메뉴/사진) ========================= */
function parseMenusAndPhotosFromHTML(html) {
  let menus = [];
  let photos = [];
  let telephone = "";
  let address = "";
  let category = "";

  const tryJson = (raw) => {
    try {
      const j = JSON.parse(raw);
      const walk = (n) => {
        if (!n) return;
        if (Array.isArray(n)) return n.forEach(walk);
        if (typeof n === "object") {
          if (!telephone && typeof n.phone === "string") telephone = n.phone;
          if (!address && typeof n.address === "string") address = n.address;
          if (!category && (n.category || n.categoryName))
            category = n.category || n.categoryName;

          if (Array.isArray(n.menus)) menus.push(...n.menus);
          if (Array.isArray(n.menuList)) menus.push(...n.menuList);
          if (n.menu?.items && Array.isArray(n.menu.items))
            menus.push(...n.menu.items);

          if (Array.isArray(n.photos)) photos.push(...n.photos);
          if (Array.isArray(n.images)) photos.push(...n.images);
          if (n.photo?.items && Array.isArray(n.photo.items))
            photos.push(...n.photo.items);

          for (const v of Object.values(n)) walk(v);
        }
      };
      walk(j);
    } catch {}
  };

  const s = String(html || "");
  const next = s.match(/id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
  if (next) tryJson(next[1]);
  if (!menus.length && !photos.length) {
    const ap = s.match(/window\.__APOLLO_STATE__\s*=\s*(.*?);\s*<\/script>/s);
    if (ap) tryJson(ap[1]);
  }

  menus = menus
    .map((m) => {
      const name = m?.name ?? m?.menuName ?? m?.title;
      const price = m?.priceString ?? m?.price ?? m?.cost ?? null;
      return name ? { name, price } : null;
    })
    .filter(Boolean);

  photos = photos
    .map((p) => {
      const url = p?.url ?? p?.imageUrl;
      return url ? { url } : null;
    })
    .filter(Boolean);

  return { menus, photos, telephone, address, category };
}

/** 공개 함수: 메뉴/사진 가져오기 */
export async function getNaverMenusAndPhotos({ placeId, name, address } = {}) {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    const err = new Error("NAVER_API_KEYS_MISSING");
    err.status = 500;
    throw err;
  }

  // 1) placeId 없으면 최소 시도로 찾아본다
  if (!placeId) {
    let hit = await findPlaceIdByLocalApi(name, address);
    if (!hit) hit = await findPlaceIdByWebSearch(name, address);

    if (!hit) {
      dlog("[NAVER][PLACEID-NOT-FOUND]", { name, address });
      return {
        placeId: null,
        name,
        address,
        menus: [],
        photos: [],
        telephone: "",
        category: "",
      };
    }
    placeId = hit.id;
    name = name ?? hit.fixedName;
    address = address ?? hit.fixedAddr;
  }

  // 2) 상세 HTML (restaurant → place 1회 재시도)
  const fetchHtml = async (kind) =>
    axios.get(`https://pcmap.place.naver.com/${kind}/${placeId}/home`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      timeout: 8000,
      validateStatus: (s) => s >= 200 && s < 500,
    });

  let hRes = await fetchHtml("restaurant");
  if (hRes.status >= 400) {
    dlog("[NAVER][RESTAURANT-FAIL]", hRes.status);
    const alt = await fetchHtml("place");
    if (alt.status < 400) hRes = alt;
  }
  if (hRes.status >= 400) {
    const err = new Error(`NAVER_PLACE_PAGE_FAILED(${hRes.status})`);
    err.status = hRes.status;
    throw err;
  }

  // 3) 파싱
  const parsed = parseMenusAndPhotosFromHTML(hRes.data);
  return { placeId, name, address, ...parsed };
}
