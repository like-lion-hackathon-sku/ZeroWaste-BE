// 위치: src / restaurants / service / naver.service.js
// 제작자: 김민호
// 최종 수정일: 2025 09 16 21:48
import "dotenv/config";
import axios from "axios";

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID ?? "";
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET ?? "";

/* 문자열에서 HTML 태그 제거 함수
 * - 네이버 API 응답에 <b> 같은 태그가 섞여 나오는 경우가 있어서
 * - 화면에 출력할 때는 태그를 다 지우고 일반적인 형태로만 반환
 */
function stripTags(s = "") {
  return String(s).replace(/<[^>]*>/g, "");
}

/* 숫자 변환 유틸 함수
 * - 문자열을 숫자로 바꾸려 시도
 * - 변환 실패하면 null 반환
 */
function toNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* ========================= 네이버 로컬 검색 ========================= */

/* 네이버 로컬 검색 API 호출 함수
 * - query(검색어)와 display(가져올 개수)를 받아서 네이버 오픈 API 호출
 * - API 키가 없으면 500 에러 발생
 * - 요청 실패 시 상태 코드와 함께 에러를 던짐
 *
 * 반환값:
 * - name: 가게 이름 (태그 제거 후)
 * - category: 카테고리 문자열
 * - address: 도로명주소(없으면 지번주소)
 * - telephone: 전화번호
 * - mapx/mapy: 좌표 (숫자 변환 실패 시 null)
 * - link: 네이버 지도/검색 링크
 */
export async function searchLocal(query, display = 20) {
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
    timeout: 7000, // 네트워크 타임아웃 7초
    validateStatus: (s) => s >= 200 && s < 500, // 500 이상이면 axios에서 바로 에러 처리
  });

  // 디버깅 로그 (DEBUG_NAVER=1일 때만 출력됨)
  dlog("[NAVER][LOCAL-RES]", {
    status: res.status,
    len: res.data?.items?.length ?? 0,
    errorMessage: res.data?.errorMessage ?? res.data?.message ?? null,
  });

  // 네이버 API에서 에러 응답이 온 경우
  if (res.status >= 400) {
    const err = new Error(`NAVER_LOCAL_SEARCH_FAILED(${res.status})`);
    err.status = res.status;
    err.data = res.data;
    throw err;
  }

  // 정상 응답 → 필요한 필드만 가공해서 반환
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
