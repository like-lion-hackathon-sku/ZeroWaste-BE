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
  return String(s)
    .replace(/\s+/g, " ")
    .replace(/[()[\]{}・·~\-_/|★☆&]+/g, " ")
    .trim();
}

/** 지점 토큰 제거/변형(수락산점, 본점, 강남점 → 수락산/강남/공백 등) */
function generateBranchVariants(name = "") {
  const base = String(name).trim();
  if (!base) return [];

  // 괄호 제거
  let n = base.replace(/[()[\]]/g, " ");
  const norm = normalizeName(n);

  const set = new Set([base, norm]);

  // '... 수락산점' → '... 수락산', '...'
  const m = norm.match(/(.+?)\s*([가-힣A-Za-z0-9]+)\s*점$/);
  if (m) {
    const shop = m[1].trim();
    const branch = m[2].trim();
    set.add(`${shop} ${branch}`);
    set.add(shop);
  }

  // 일반 지점 토큰 제거
  set.add(
    norm
      .replace(/\b(본점|지점|분점|역점|역|센터|타워|몰|캠퍼스)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );

  // 'OO O점' 광범위 제거
  set.add(
    norm
      .replace(/\s*[가-힣A-Za-z0-9]+\s*점\b/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  );

  return [...set].filter((s) => s && s.length >= 2);
}

/** &/앤/and 변형 포함 */
function generateNameVariants(name = "") {
  const base = String(name).trim();
  const norm = normalizeName(base);
  const withAmp = norm.replace(/앤/gi, "&").replace(/\s*&\s*/g, "&");
  const withAndKo = norm.replace(/&/g, "앤");
  const withAndEn = norm.replace(/&/g, "and");
  const spaced1 = norm.replace(/(라운지)\s*(앤|&|and)\s*(바)/gi, "$1 $2 $3");
  const noSpace = norm.replace(/\s+/g, "");
  const set = new Set([
    base,
    norm,
    withAmp,
    withAndKo,
    withAndEn,
    spaced1,
    noSpace,
    norm.replace(/라운지\s*바/gi, "라운지바"),
  ]);
  return [...set].filter((s) => s && s.length >= 2);
}

/** 이름 전체 변형(지점 + &/앤/and) */
function generateNameVariantsAll(name = "") {
  const set = new Set();
  for (const v of generateBranchVariants(name)) set.add(v);
  for (const v of generateNameVariants(name)) set.add(v);
  return [...set];
}

/** 주소 단순화: 광역/구/로/길만 남기고 번지/층/호수 제거 */
function normalizeAddress(addr = "") {
  const s = String(addr)
    .replace(/\s+/g, " ")
    .replace(/\b(?:B\d+|지하\d*층|지상\d*층|[0-9]+동|[0-9]+호)\b/gi, "")
    .replace(/\b(\d{1,4})(?:-\d{1,3})?\b/g, "")
    .replace(/[(),]/g, " ")
    .trim();
  return {
    short: s
      .replace(
        /\b(대한민국|서울특별시|경기도|인천광역시|부산광역시|대구광역시|대전광역시|광주광역시|울산광역시)\b/g,
        "",
      )
      .replace(/\s+/g, " ")
      .trim(),
    full: String(addr).trim(),
  };
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
  return (
    host === "pcmap.place.naver.com" ||
    host === "map.place.naver.com" ||
    host === "place.naver.com" ||
    host === "m.place.naver.com"
  );
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

/* ========================= 외부 상세 파서 ========================= */
function parseMenusAndPhotosFromHTML(html) {
  let raw = null;
  const next = html.match(/id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
  if (next) raw = next[1];
  if (!raw) {
    const apollo = html.match(/window\.__APOLLO_STATE__=(.*?);\s*<\/script>/s);
    if (apollo) raw = apollo[1];
  }

  let menus = [];
  let photos = [];
  let telephone = "";
  let address = "";
  let category = "";

  const walk = (node, fn) => {
    if (!node) return;
    if (Array.isArray(node)) return node.forEach((v) => walk(v, fn));
    if (typeof node === "object") {
      fn(node);
      for (const v of Object.values(node)) walk(v, fn);
    }
  };

  try {
    if (raw) {
      const json = JSON.parse(raw);
      walk(json, (obj) => {
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

    // 2-2) HTML 본문에서 추출
    const html = String(r.data || "");
    id = extractPlaceIdFromHtml(html);
    if (id) return id;

    // 3) <title>/og:title에서 상호 추출 후 Local 재검색
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

  const nmCands = generateNameVariantsAll(name);
  const { short, full } = normalizeAddress(address || "");

  const tryQueries = [];
  for (const nm of nmCands) {
    tryQueries.push(nm);
    if (full) tryQueries.push(`${nm} ${full}`);
    if (short) tryQueries.push(`${nm} ${short}`);
  }

  for (const q of tryQueries) {
    const r = await axios.get(url, {
      params: { query: q, display: 20 },
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

      // 네이버 place/지도 링크만 처리
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

/* ============ placeId 탐색: 웹문서 검색(백업, 확대) ============ */
async function findPlaceIdByWebSearch(name, address) {
  const headers = {
    "X-Naver-Client-Id": NAVER_CLIENT_ID,
    "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
  };

  const siteQueries = [
    "site:pcmap.place.naver.com",
    "site:m.place.naver.com",
    "site:place.naver.com",
  ];

  const nmCands = generateNameVariantsAll(name).flatMap((nm) => [
    nm,
    `"${nm}"`,
  ]);
  const { short, full } = normalizeAddress(address || "");
  const addrs = [];
  if (full) addrs.push(full, `"${full}"`);
  if (short) addrs.push(short, `"${short}"`);

  const queryCombos = [];
  for (const site of siteQueries) {
    for (const nm of nmCands) {
      if (addrs.length) {
        for (const ad of addrs) queryCombos.push([site, nm, ad].join(" "));
      }
      queryCombos.push([site, nm].join(" "));
    }
  }

  const seen = new Set();
  const uniqueQueries = queryCombos.filter((q) => {
    if (seen.has(q)) return false;
    seen.add(q);
    return true;
  });

  for (const q of uniqueQueries) {
    try {
      const r = await axios.get(
        "https://openapi.naver.com/v1/search/webkr.json",
        {
          params: { query: q, display: 30 },
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
      if (r.status >= 400) continue;

      const items = r.data?.items ?? [];
      for (const it of items) {
        const fields = [
          it.link,
          it.url,
          it.description,
          it.title,
          stripTags(it.link || ""),
          stripTags(it.description || ""),
          stripTags(it.title || ""),
        ].filter(Boolean);
        for (const f of fields) {
          const id = extractPlaceIdFromUrl(f);
          if (id) return { id };
        }
      }
    } catch {}
  }
  return null;
}

/* ============ placeId 탐색: 네이버 지도 검색(최후 fallback) ============ */
async function findPlaceIdByNaverMapSearch(name, address) {
  const { short, full } = normalizeAddress(address || "");
  const q = encodeURIComponent(
    [normalizeName(name), full || short].filter(Boolean).join(" "),
  );
  const url = `https://map.naver.com/v5/search/${q}`;

  try {
    const r = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      timeout: 8000,
      validateStatus: (s) => s >= 200 && s < 500,
    });

    const html = String(r.data || "");
    let id =
      extractPlaceIdFromHtml(html) ||
      (html.match(/"placeId"\s*:\s*"(\d{4,})"/)?.[1] ?? null) ||
      (html.match(/"id"\s*:\s*(\d{4,})(?!\s*")/)?.[1] ?? null);

    if (id) return { id };
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
    // 1) Local API
    let hit = await findPlaceIdByLocalApi(name, address);

    // 2) WebKR
    if (!hit) hit = await findPlaceIdByWebSearch(name, address);

    // 3) 네이버 지도 검색
    if (!hit) hit = await findPlaceIdByNaverMapSearch(name, address);

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

  // 상세 페이지: restaurant 우선, 실패 시 place로 재시도
  const tryFetch = async (kind) => {
    const url = `https://pcmap.place.naver.com/${kind}/${placeId}/home`;
    const r = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      timeout: 8000,
      validateStatus: (s) => s >= 200 && s < 500,
    });
    return r;
  };

  let hRes = await tryFetch("restaurant");
  if (hRes.status >= 400) {
    dlog("[NAVER][RESTAURANT-FAIL]", hRes.status);
    const alt = await tryFetch("place");
    if (alt.status < 400) hRes = alt;
  }

  if (hRes.status >= 400) {
    const err = new Error(`NAVER_PLACE_PAGE_FAILED(${hRes.status})`);
    err.status = hRes.status;
    throw err;
  }

  const parsed = parseMenusAndPhotosFromHTML(hRes.data);
  return { placeId, name, address, ...parsed };
}
