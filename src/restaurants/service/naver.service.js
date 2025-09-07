// 위치: src/restaurants/service/naver.service.js
import "dotenv/config"; // Render/로컬 공통
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
  return String(s)
    .replace(/\s+/g, " ")
    .replace(/[()[\]{}・·~\-_/|★☆]+/g, " ")
    .trim();
}
function getHost(u = "") {
  try {
    return new URL(u).host.toLowerCase();
  } catch {
    return "";
  }
}
/** 네이버 place/지도 링크만 통과 (인스타/블로그 컷) */
function isNaverPlaceLink(link = "") {
  const host = getHost(link);
  if (!host.endsWith("naver.com")) return false;
  // 대표 place 도메인만 허용
  if (
    host === "pcmap.place.naver.com" ||
    host === "map.place.naver.com" ||
    host === "place.naver.com" ||
    host === "m.place.naver.com"
  ) {
    return true;
  }
  // 그 외의 네이버 하위 도메인은 보수적으로 제외
  return false;
}

/** 다양한 URL 패턴에서 placeId 추출 */
function extractPlaceIdFromUrl(url = "") {
  if (!url) return null;
  try {
    const u = new URL(url);
    for (const key of ["placeId", "poiId", "id", "code"]) {
      const v = u.searchParams.get(key);
      if (v && /^\d{4,}$/.test(v)) return v;
    }
  } catch {}
  const s = String(url);
  let m = s.match(/(?:entry\/place|place|restaurant)\/(\d{4,})(?:[/?#]|$)/);
  if (m) return m[1];
  m = s.match(/(?:placeId|poiId|id|code)=(\d{4,})/);
  if (m) return m[1];
  return null;
}

/** HTML 본문에서 placeId 추출(여러 케이스 방어) */
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

  const nextMatch = s.match(/id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
  if (nextMatch) {
    try {
      const json = JSON.parse(nextMatch[1]);
      const str = JSON.stringify(json);
      m =
        str.match(/(?:entry\/place|place|restaurant)\/(\d{4,})/) ||
        str.match(/"placeId"\s*:\s*"(\d{4,})"/) ||
        str.match(/"poiId"\s*:\s*(\d{4,})/) ||
        str.match(/"id"\s*:\s*(\d{4,})(?!\s*")/);
      if (m) return m[1];
    } catch {}
  }

  const apolloMatch = s.match(
    /window\.__APOLLO_STATE__\s*=\s*(.*?);\s*<\/script>/s,
  );
  if (apolloMatch) {
    try {
      const json = JSON.parse(apolloMatch[1]);
      const str = JSON.stringify(json);
      m =
        str.match(/(?:entry\/place|place|restaurant)\/(\d{4,})/) ||
        str.match(/"placeId"\s*:\s*"(\d{4,})"/) ||
        str.match(/"poiId"\s*:\s*(\d{4,})/) ||
        str.match(/"id"\s*:\s*(\d{4,})(?!\s*")/);
      if (m) return m[1];
    } catch {}
  }

  m =
    s.match(
      /https?:\/\/(?:pcmap|map)\.place\.naver\.com\/(?:restaurant|place)\/(\d{4,})/,
    ) ||
    s.match(/(?:entry\/place|place|restaurant)\/(\d{4,})(?=[/?#\s"'])/) ||
    s.match(/(?:placeId|poiId|id|code)=(\d{4,})/);
  if (m) return m[1];

  return null;
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

/* ============ placeId 탐색: 링크 해석 ============ */
async function resolvePlaceIdFromLink(link) {
  if (!link) return null;

  const opts = {
    timeout: 10000,
    maxRedirects: 10,
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
    try {
      const h = await axios.head(link, opts);
      const final1 = h?.request?.res?.responseUrl ?? h?.request?.path ?? link;
      const id1 = extractPlaceIdFromUrl(final1);
      if (id1) return id1;
    } catch {}

    const r = await axios.get(link, opts);
    const finalUrl = r?.request?.res?.responseUrl ?? r?.request?.path ?? link;

    let id = extractPlaceIdFromUrl(finalUrl);
    if (id) return id;

    const html = String(r.data || "");
    id = extractPlaceIdFromHtml(html);
    if (id) return id;

    // fallback: <title>/og:title에서 상호 추출 후 재검색
    const t =
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ||
      html.match(
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      )?.[1] ||
      null;
    if (t) {
      const rough = stripTags(t)
        .replace(/\s*[:\-–|]\s*네이버\s*지도.*$/i, "")
        .trim();
      try {
        const reHit = await findPlaceIdByLocalApi(rough, "");
        if (reHit?.id) return reHit.id;
      } catch {}
    }
  } catch {}
  return null;
}

/* ============ placeId 탐색: 로컬 API ============ */
async function findPlaceIdByLocalApi(name, address) {
  const url = "https://openapi.naver.com/v1/search/local.json";
  const headers = {
    "X-Naver-Client-Id": NAVER_CLIENT_ID,
    "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
  };

  const tryQueries = [
    address ? `${normalizeName(name)} ${address}` : normalizeName(name),
    normalizeName(name),
    (address || "").replace(/\s?(?:B\d+|지하\d+층|[0-9]+호)\b/g, "").trim(),
  ].filter(Boolean);

  for (const q of tryQueries) {
    const r = await axios.get(url, {
      params: { query: q, display: 5 },
      headers,
      timeout: 7000,
      validateStatus: (s) => s >= 200 && s < 500,
    });

    if (r.status === 429) {
      dlog("[NAVER][RATE-LIMIT] backing off 400ms");
      await new Promise((res) => setTimeout(res, 400));
      continue;
    }
    if (r.status >= 400) continue;

    const items = r.data?.items ?? [];
    for (const item of items) {
      const link = item.link || "";

      // 🔴 네이버 place/지도 링크만 처리
      if (!isNaverPlaceLink(link)) {
        dlog("[NAVER][SKIP-NON-NAVER]", {
          q,
          link,
          title: stripTags(item.title),
        });
        continue;
      }

      dlog("[NAVER][TRY]", { q, link, title: stripTags(item.title) });

      let id = extractPlaceIdFromUrl(link);
      if (!id) id = await resolvePlaceIdFromLink(link);
      dlog("[NAVER][RESOLVE]", { link, id });

      if (id) {
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

/* ============ placeId 탐색: 웹문서 검색(백업) ============ */
async function findPlaceIdByWebSearch(name, address) {
  const url = "https://openapi.naver.com/v1/search/webkr.json";
  const headers = {
    "X-Naver-Client-Id": NAVER_CLIENT_ID,
    "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
  };
  const q = [normalizeName(name), address].filter(Boolean).join(" ");

  try {
    const r = await axios.get(url, {
      params: { query: `site:pcmap.place.naver.com ${q}`, display: 5 },
      headers,
      timeout: 7000,
      validateStatus: (s) => s >= 200 && s < 500,
    });
    dlog("[NAVER][WEBKR-STATUS]", {
      status: r.status,
      len: r.data?.items?.length ?? 0,
    });
    if (r.status >= 400) return null;

    const items = r.data?.items ?? [];
    for (const it of items) {
      const cand = it.link || it.url || it.description || "";
      dlog("[NAVER][WEBKR-ITEM]", { cand });
      const id =
        extractPlaceIdFromUrl(cand) || extractPlaceIdFromUrl(stripTags(cand));
      if (id) return { id };
    }
  } catch {}
  return null;
}

/* ========================= 외부 상세(메뉴/사진) ========================= */
export async function getNaverMenusAndPhotos(args = {}) {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    const err = new Error("NAVER_API_KEYS_MISSING");
    err.status = 500;
    throw err;
  }

  let { placeId, name, address } = args;

  if (!placeId) {
    let hit = await findPlaceIdByLocalApi(name, address);
    if (!hit) hit = await findPlaceIdByWebSearch(name, address); // fallback

    if (!hit) {
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

  const placeUrl = `https://pcmap.place.naver.com/restaurant/${placeId}/home`;
  const hRes = await axios.get(placeUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
      "Accept-Language": "ko-KR,ko;q=0.9",
    },
    timeout: 8000,
    validateStatus: (s) => s >= 200 && s < 500,
  });

  if (hRes.status >= 400) {
    const err = new Error(`NAVER_PLACE_PAGE_FAILED(${hRes.status})`);
    err.status = hRes.status;
    throw err;
  }

  // HTML 내부 JSON에서 메뉴/사진 꺼내기
  const parsed = parseMenusAndPhotosFromHTML(hRes.data);
  return { placeId, name, address, ...parsed };
}
