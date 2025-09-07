import axios from "axios";

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

/** 지역 검색 */
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
    timeout: 5000,
  });

  return (res.data?.items ?? []).map((item) => ({
    name: stripTags(item.title),
    category: item.category,
    address: item.roadAddress || item.address || "",
    telephone: item.telephone || "",
    mapx: toNumberOrNull(item.mapx),
    mapy: toNumberOrNull(item.mapy),
  }));
}

/** strip HTML tags */
function stripTags(s = "") {
  return s.replace(/<[^>]*>/g, "");
}
function toNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* ===== 외부 상세 ===== */
function extractPlaceIdFromUrl(url = "") {
  const m = url?.match(/(?:restaurant|place)\/(\d{5,})/);
  return m ? m[1] : null;
}

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
      Object.values(node).forEach((v) => deepWalk(v, fn));
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
        menuCands.forEach((it) => {
          const name = it.name || it.menuName || it.title;
          const price = it.priceString || it.price || it.cost;
          if (name) menus.push({ name, price });
        });

        const photoCands = [];
        if (Array.isArray(obj.photos)) photoCands.push(...obj.photos);
        if (Array.isArray(obj.images)) photoCands.push(...obj.images);
        if (obj.photo && Array.isArray(obj.photo.items))
          photoCands.push(...obj.photo.items);
        photoCands.forEach((it) => {
          const url = it.url || it.imageUrl;
          if (url) photos.push({ url });
        });
      });
    }
  } catch {}

  return { menus, photos, telephone, address, category };
}

/** 네이버 메뉴/사진 상세 */
export async function getNaverMenusAndPhotos(args = {}) {
  let { placeId, name, address } = args;
  if (!placeId) {
    const url = "https://openapi.naver.com/v1/search/local.json";
    const q = address ? `${name} ${address}` : name;
    const sRes = await axios.get(url, {
      params: { query: q, display: 1 },
      headers: {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
      },
      timeout: 5000,
    });
    const item = sRes.data?.items?.[0];
    if (!item) return null;
    placeId = extractPlaceIdFromUrl(item.link);
    name = name ?? stripTags(item.title);
    address = address ?? (item.roadAddress || item.address || "");
  }

  const placeUrl = `https://pcmap.place.naver.com/restaurant/${placeId}/home`;
  const hRes = await axios.get(placeUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
      "Accept-Language": "ko-KR,ko;q=0.9",
    },
    timeout: 7000,
  });

  const parsed = parseMenusAndPhotosFromHTML(hRes.data);
  return { placeId, name, address, ...parsed };
}
