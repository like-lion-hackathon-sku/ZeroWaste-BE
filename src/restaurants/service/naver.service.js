// 위치: src/restaurants/service/naver.service.js
import "dotenv/config"; // .env 불러오기
import axios from "axios";

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID ?? "";
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET ?? "";

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
    const byQs = u.searchParams.get("placeId");
    if (byQs && /^\d{5,}$/.test(byQs)) return byQs;

    // /entry/place/{id}, /place/{id}, /restaurant/{id}
    const m = url.match(
      /(?:entry\/place|place|restaurant)\/(\d{5,})(?:[/?#]|$)/,
    );
    if (m) return m[1];

    // placeId=123456 형태가 path/fragment에 박힌 경우
    const m2 = url.match(/placeId=(\d{5,})/);
    if (m2) return m2[1];

    return null;
  } catch {
    const m = String(url).match(/(?:restaurant|place)\/(\d{5,})/);
    return m ? m[1] : null;
  }
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
  } catch {
    // 파싱 실패는 빈 결과 허용
  }

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
    validateStatus: (s) => s >= 200 && s < 500, // 4xx도 데이터로 받아 처리
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
async function findPlaceIdByLocalApi(name, address) {
  const url = "https://openapi.naver.com/v1/search/local.json";
  const headers = {
    "X-Naver-Client-Id": NAVER_CLIENT_ID,
    "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
  };

  const tryQueries = [
    address ? `${normalizeName(name)} ${address}` : normalizeName(name),
    address || "",
    normalizeName(name),
  ].filter(Boolean);

  for (const q of tryQueries) {
    const r = await axios.get(url, {
      params: { query: q, display: 1 },
      headers,
      timeout: 7000,
      validateStatus: (s) => s >= 200 && s < 500,
    });
    if (r.status >= 400) continue;
    const item = r.data?.items?.[0];
    if (!item) continue;
    const id = extractPlaceIdFromUrl(item.link);
    if (id) {
      return {
        id,
        fixedName: stripTags(item.title),
        fixedAddr: item.roadAddress || item.address || "",
      };
    }
  }
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

  // placeId 없으면 보조 탐색으로 확보
  if (!placeId) {
    const hit = await findPlaceIdByLocalApi(name, address);
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
