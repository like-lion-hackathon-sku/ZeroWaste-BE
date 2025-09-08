import "dotenv/config";
import axios from "axios";

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID ?? "";
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET ?? "";

const dlog = (...args) => {
  if (process.env.DEBUG_NAVER === "1") console.log(...args);
};

function stripTags(s = "") {
  return String(s).replace(/<[^>]*>/g, "");
}
function toNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* ========================= 네이버 로컬 검색 ========================= */
export async function searchLocal(query, display = 5) {
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

import { searchLocal } from "./naver.service.js";

export async function searchNearby({ q, page = 1, size = 20 }) {
  // 네이버 로컬검색은 start(1~)가 있으나, 현재 searchLocal 시그니처가 (query, display)만 지원하므로
  // 우선 display만 맞추고, 나중에 필요하면 start 파라미터를 추가하세요.
  const items = await searchLocal(q, size);
  // FE가 쓰기 편한 형태로 래핑
  return {
    total: items.length, // 네이버는 total을 주지만 현재 함수는 map만 리턴 → 필요하면 res.data.total까지 넘기도록 확장
    items,
    page,
    size,
  };
}
