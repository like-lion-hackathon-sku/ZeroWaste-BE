// 위치: src/restaurants/service/naver.service.js
import "dotenv/config"; // .env 불러오기
import axios from "axios";

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID ?? "";
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET ?? "";
const dlog = (...args) => {
  if (process.env.DEBUG_NAVER === "1") console.log(...args);
};

/* ================= 공통 유틸 ================= */
function stripTags(s = "") {
  return String(s).replace(/<[^>]*>/g, "");
}
function toNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** 이름 정규화(검색 성공률 향상) */
function normalizeName(s = "") {
  return String(s)
    .replace(/\s+/g, " ")
    .replace(/[()[\]{}・·~\-_/|★☆]+/g, " ")
    .trim();
}

/** 다양한 URL 패턴에서 placeId 추출 (보강) */
function extractPlaceIdFromUrl(url = "") {
  if (!url) return null;
  try {
    const u = new URL(url);
    for (const key of ["placeId", "id", "code"]) {
      const v = u.searchParams.get(key);
      if (v && /^\d{4,}$/.test(v)) return v;
    }
  } catch {}
  const s = String(url);
  let m = s.match(/(?:entry\/place|place|restaurant)\/(\d{4,})(?:[/?#]|$)/);
  if (m) return m[1];
  m = s.match(/(?:placeId|id|code)=(\d{4,})/);
  if (m) return m[1];
  return null;
}

/* ================= 외부 상세 파서 ================= */
function parseMenusAndPhotosFromHTML(html) {
  let raw = null;
  const nextMatch = html.match(/id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
  if (nextMatch) raw = nextMatch[1];
  if (!raw) {
    const apolloMatch = html.match(
      /window\.__APOLLO_STATE__=(.*?);\s*<\/script>/s,
    );
    if (apolloMatch) raw = apolloMatch[1];
  }

  let menus = [];
  let photos = [];
  let telephone = "";
  let address = "";
  let category = "";

  const deepWalk = (node, fn) => {
    if (!node) return;
    if (Array.isArray(node)) return node.forEach((v) => deepWalk(v, fn));
    if (typeof node === "object") {
      fn(node);
      for (const v of Object.values(node)) deepWalk(v, fn);
    }
  };

  try {
    if (raw) {
      const json = JSON.parse(raw);
      deepWalk(json, (obj) => {
        if (!telephone && typeof obj.phone === "string") telephone = obj.phone;
        if (!address && typeof obj.address === "string") address = obj.address;
        if (!category && (obj.category || obj.categoryName))
          category = obj.category || obj.categoryName;

        const menuCands = [];
        if (Array.isArray(obj.menus)) menuCands.push(...obj.menus);
        if (Array.isArray(obj.menuList)) menuCands.push(...obj.menuList);
        if (obj.menu && Array.isArray(obj.menu.items))
          menuCands.push(...obj.menu.items);
        for (const it of menuCands) {
          const name = it?.name ?? it?.menuName ?? it?.title;
          const price = it?.priceString ?? it?.price ?? it?.cost ?? null;
          if (name) menus.push({ name, price });
        }

        const photoCands = [];
        if (Array.isArray(obj.photos)) photoCands.push(...obj.photos);
        if (Array.isArray(obj.images)) photoCands.push(...obj.images);
        if (obj.photo && Array.isArray(obj.photo.items))
          photoCands.push(...obj.photo.items);
        for (const it of photoCands) {
          const url = it?.url ?? it?.imageUrl;
          if (url) photos.push({ url });
        }
      });
    }
  } catch {}
  return { menus, photos, telephone, address, category };
}

/* ================= 네이버 로컬 검색 ================= */
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

/* ============ placeId 탐색 보조(재시도 전략) ============ */
/** 링크를 실제로 열어 최종 URL/HTML에서 placeId 추출 */
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
    // 1) HEAD로 최종 URL 확인
    try {
      const h = await axios.head(link, opts);
      const final1 = h?.request?.res?.responseUrl ?? h?.request?.path ?? link;
      const id1 = extractPlaceIdFromUrl(final1);
      if (id1) return id1;
    } catch {}

    // 2) GET으로 HTML 수집
    const r = await axios.get(link, opts);
    const finalUrl = r?.request?.res?.responseUrl ?? r?.request?.path ?? link;

    // 2-1) 최종 URL에서 바로 추출
    let id = extractPlaceIdFromUrl(finalUrl);
    if (id) return id;

    // 2-2) HTML 본문에서 추출 (검색 페이지 핵심)
    const html = String(r.data || "");
    id = extractPlaceIdFromHtml(html);
    if (id) return id;

    // 3) 마지막 구제: <title>/og:title에서 상호명 뽑아 Local 재검색
    const t =
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ||
      html.match(
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      )?.[1] ||
      null;
    if (t) {
      const rough = stripTags(t)
        .trim()
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

/** 로컬 검색 결과 후보 5개를 돌며 placeId 확보(+링크 해석) */
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
    if (r.status >= 400) continue;

    const items = r.data?.items ?? [];
    for (const item of items) {
      dlog("[NAVER][TRY]", {
        q,
        link: item.link,
        title: stripTags(item.title),
      });
      let id = extractPlaceIdFromUrl(item.link);
      if (!id) {
        id = await resolvePlaceIdFromLink(item.link);
        dlog("[NAVER][RESOLVE]", { link: item.link, id });
      }
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

/** 웹문서 검색으로 pcmap 링크에서 placeId 캐치 (콘솔에서 활성화 필요) */
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

/* ================= 메뉴/사진 상세 ================= */
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

  const parsed = parseMenusAndPhotosFromHTML(hRes.data);
  return { placeId, name, address, ...parsed };
}

function extractPlaceIdFromHtml(html = "") {
  const s = String(html);

  // canonical / og:url 에 직접 들어있는 경우
  let m =
    s.match(
      /<link[^>]+rel=["']canonical["'][^>]+href=["'][^"']*(?:restaurant|place)\/(\d{4,})/i,
    ) ||
    s.match(
      /<meta[^>]+property=["']og:url["'][^>]+content=["'][^"']*(?:restaurant|place)\/(\d{4,})/i,
    );
  if (m) return m[1];

  // __NEXT_DATA__ 내부 JSON에서 추출
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

  // window.__APOLLO_STATE__ 등 초기 스냅샷에서 추출
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

  // 일반 본문 내 URL/쿼리 문자열에서 추출
  m =
    s.match(
      /https?:\/\/(?:pcmap|map)\.place\.naver\.com\/(?:restaurant|place)\/(\d{4,})/,
    ) ||
    s.match(/(?:entry\/place|place|restaurant)\/(\d{4,})(?=[/?#\s"'])/) ||
    s.match(/(?:placeId|poiId|id|code)=(\d{4,})/);
  if (m) return m[1];

  return null;
}

export async function getRestaurantExternalDetail(restaurantId) {
  const base = await restRepo.findById(restaurantId);
  if (!base) {
    const err = new Error("RESTAURANT_NOT_FOUND");
    err.status = 404;
    throw err;
  }

  let ext = null;
  try {
    ext = await getNaverMenusAndPhotos({
      name: base.name,
      address: base.address,
    });
  } catch (e) {
    // 외부 실패는 로그만 남기고 빈 값으로 진행
    console.warn("[NAVER][EXTERNAL-FAIL]", e?.status || e?.message || e);
    ext = {};
  }

  return {
    restaurantId: base.id,
    name: base.name,
    address: base.address,
    telephone: ext?.telephone ?? base.telephone ?? "",
    category: ext?.category ?? base.category ?? "",
    menus: ext?.menus ?? [],
    photos: ext?.photos ?? [],
    placeId: ext?.placeId ?? null,
  };
}
