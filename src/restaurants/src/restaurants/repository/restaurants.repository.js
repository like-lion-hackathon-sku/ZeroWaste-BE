import { PrismaClient } from "@prisma/client";
import axios from "axios";

const g = globalThis;
const prisma = g.__fwzmPrisma ?? new PrismaClient();
if (!g.__fwzmPrisma) g.__fwzmPrisma = prisma;

/** 공통 선택 컬럼 */
const baseSelect = {
  id: true, name: true, category: true, address: true, telephone: true,
  mapx: true, mapy: true, is_sponsored: true, created_at: true, updated_at: true,
};

export async function findById(id) {
  return prisma.restaurants.findUnique({ where: { id }, select: baseSelect });
}

export async function findByTelephone(telDigits) {
  return prisma.restaurants.findFirst({ where: { telephone: telDigits }, select: baseSelect });
}

/** 근사 박스 내 최근접 1개 */
export async function findNearestByMicroDeg(mapx, mapy, { dx, dy }) {
  const candidates = await prisma.restaurants.findMany({
    where: {
      AND: [
        { mapx: { gte: mapx - dx, lte: mapx + dx } },
        { mapy: { gte: mapy - dy, lte: mapy + dy } },
      ],
    },
    select: baseSelect,
    take: 20,
  });
  if (!candidates.length) return null;
  return candidates
    .map(r => ({ r, d2: (r.mapx - mapx) ** 2 + (r.mapy - mapy) ** 2 }))
    .sort((a,b) => a.d2 - b.d2)[0]?.r ?? null;
}

/** bbox + 커서 페이지네이션 */
export async function findManyInBBox(bbox, { limit = 20, cursor = 0 }) {
  const where = {
    AND: [
      { mapx: { gte: bbox.left, lte: bbox.right } },
      { mapy: { gte: bbox.bottom, lte: bbox.top } },
    ],
  };
  const total = await prisma.restaurants.count({ where });
  const items = await prisma.restaurants.findMany({
    where, select: baseSelect, orderBy: [{ id: "asc" }], skip: cursor, take: limit,
  });
  const nextCursor = cursor + items.length < total ? cursor + items.length : null;
  return { items, nextCursor, total };
}

/** 외부 place로 생성 */
export async function createFromExternal(payload) {
  return prisma.restaurants.create({
    data: {
      name: payload.name,
      category: payload.category,
      address: payload.address,
      telephone: payload.telephone, // 숫자만 저장 권장
      mapx: payload.mapx,
      mapy: payload.mapy,
      is_sponsored: !!payload.is_sponsored,
    },
    select: baseSelect,
  });
}

/* ───────── 네이버 API 프록시 (예시) ───────── */
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
// 실제 place 상세 API로 교체하세요.
const NAVER_PLACE_DETAIL_URL = "https://openapi.naver.com/v1/search/local.json";

export async function fetchNaverPlaceDetail(placeId) {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    const err = new Error("NAVER_API_KEY_MISSING"); err.status = 500; throw err;
  }
  // 데모: placeId를 키워드처럼 조회. 실제 스펙에 맞게 수정 필요.
  const resp = await axios.get(NAVER_PLACE_DETAIL_URL, {
    params: { query: placeId, display: 1 },
    headers: {
      "X-Naver-Client-Id": NAVER_CLIENT_ID,
      "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
    },
    timeout: 5000,
  });
  const item = resp?.data?.items?.[0];
  if (!item) { const e = new Error("NAVER_PLACE_NOT_FOUND"); e.status = 404; throw e; }

  return {
    name: item.title?.replace(/<[^>]+>/g, "") ?? null,
    category: item.category ?? null,
    address: item.address ?? item.roadAddress ?? null,
    telephone: item.telephone ?? null,
    // 좌표 단위는 실제 API 스펙에 맞춰 변환 필요
    mapx: Number.isFinite(Number(item.mapx)) ? Math.round(Number(item.mapx)) : null,
    mapy: Number.isFinite(Number(item.mapy)) ? Math.round(Number(item.mapy)) : null,
    photos: [],
  };
}