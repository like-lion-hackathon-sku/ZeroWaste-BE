// src/restaurants/service/naver.service.js
import "dotenv/config";
import axios from "axios";
import http from "node:http";
import https from "node:https";

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID ?? "";
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET ?? "";

// ========================= 네트워크 안정화 =========================
const httpAgent = new http.Agent({ keepAlive: true, family: 4 });
const httpsAgent = new https.Agent({ keepAlive: true, family: 4 });

const naver = axios.create({
  baseURL: "https://openapi.naver.com",
  timeout: 15000, // ⬆️ 7s → 15s
  httpAgent,
  httpsAgent,
  headers: {
    "X-Naver-Client-Id": NAVER_CLIENT_ID,
    "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
    "User-Agent": "FWZM/1.0 (+https://example.com)",
  },
  validateStatus: (s) => s >= 200 && s < 500,
});

// ========================= 간단 리트라이 (지수 백오프) =========================
async function withRetry(fn, { retries = 2, baseDelay = 400 } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const transient =
        e.code === "ECONNABORTED" ||
        e.code === "ETIMEDOUT" ||
        e.code === "ECONNRESET" ||
        e.response?.status >= 500;
      if (!transient || i === retries) break;
      await new Promise((r) => setTimeout(r, baseDelay * 2 ** i));
    }
  }
  throw lastErr;
}

/* ========================= 네이버 로컬 검색 ========================= */
export async function searchLocal(query, display = 5, start = 1) {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    const err = new Error("NAVER_API_KEYS_MISSING");
    err.status = 500;
    throw err;
  }

  const doReq = () =>
    naver.get("/v1/search/local.json", { params: { query, display, start } });

  const res = await withRetry(doReq);

  if (process.env.DEBUG_NAVER === "1") {
    console.log("[NAVER][LOCAL-RES]", {
      status: res.status,
      len: res.data?.items?.length ?? 0,
      errorMessage: res.data?.errorMessage ?? res.data?.message ?? null,
    });
  }

  if (res.status >= 400) {
    const err = new Error(`NAVER_LOCAL_SEARCH_FAILED(${res.status})`);
    err.status = res.status;
    err.data = res.data;
    throw err;
  }

  const stripTags = (s = "") => String(s).replace(/<[^>]*>/g, "");
  const toNumberOrNull = (v) => (Number.isFinite(+v) ? +v : null);

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
