// 위치: src/restaurants/service/naver.service.js
import axios from "axios";

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

/**
 * 네이버 지역 검색(Open API) 호출
 * @param {string} query - 검색어 (예: '성북구 맛집')
 * @param {number} [display=10] - 결과 개수(최대 30)
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
    timeout: 5000,
  });

  // 필요한 필드만 정규화 (우리 DB 스키마에 맞도록)
  return (res.data?.items ?? []).map((item) => ({
    name: stripTags(item.title),
    category: item.category, // 실제 enum 매핑은 ensureRestaurant 내에서 처리
    address: item.roadAddress || item.address || "",
    telephone: item.telephone || "",
    mapx: toNumberOrNull(item.mapx),
    mapy: toNumberOrNull(item.mapy),
    // 필요 시 item.link 등 추가 가능
  }));
}

function stripTags(s = "") {
  return s.replace(/<[^>]*>/g, "");
}
function toNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
