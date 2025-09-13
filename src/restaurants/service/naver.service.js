// 위치: src / restaurants / service /naver.service.js
import "dotenv/config";
import axios from "axios";

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID ?? "";
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET ?? "";

/**
 * 디버그 로그 출력 (DEBUG_NAVER=1 일 때만 동작)
 * @param  {...any} args
 */
const dlog = (...args) => {
  if (process.env.DEBUG_NAVER === "1") console.log(...args);
};

/**
 * 문자열에서 HTML 태그 제거
 * @param {string} [s=""]
 * @returns {string}
 */
function stripTags(s = "") {
  return String(s).replace(/<[^>]*>/g, "");
}

/**
 * 숫자 변환 시도, 실패 시 null 반환
 * @param {any} v
 * @returns {number|null}
 */
function toNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* ========================= 네이버 로컬 검색 ========================= */

/**
 * 네이버 로컬 검색 API 호출
 *
 * @async
 * @param {string} query - 검색어
 * @param {number} [display=10] - 반환할 결과 개수 (기본 10, 최대 30)
 * @returns {Promise<Array<{name:string, category:string, address:string, telephone:string, mapx:number|null, mapy:number|null, link:string}>>}
 *
 * @throws {Error & {status:number, data?:any}} NAVER_API_KEYS_MISSING (500), NAVER_LOCAL_SEARCH_FAILED(status)
 */
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
