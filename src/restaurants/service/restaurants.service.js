// 위치: src/restaurants/service/restaurants.service.js
import * as restRepo from "../repository/restaurants.repository.js";
import {
  getNaverMenusAndPhotos,
  buildExternalDetail,
} from "./naver.service.js";

/** 카테고리 문자열 → ENUM 매핑 (Prisma enum: FoodCategory) */
function toFoodCategoryEnum(input) {
  const s = String(input || "").toLowerCase();
  const pairs = [
    ["한식", "KOREAN"],
    ["korean", "KOREAN"],
    ["일식", "JAPANESE"],
    ["japanese", "JAPANESE"],
    ["스시", "JAPANESE"],
    ["초밥", "JAPANESE"],
    ["이자카야", "JAPANESE"],
    ["중식", "CHINESE"],
    ["chinese", "CHINESE"],
    ["양식", "WESTERN"],
    ["western", "WESTERN"],
    ["이탈리아", "WESTERN"],
    ["피자", "WESTERN"],
    ["분식", "FASTFOOD"],
    ["패스트푸드", "FASTFOOD"],
    ["fastfood", "FASTFOOD"],
    ["버거", "FASTFOOD"],
    ["치킨", "FASTFOOD"],
    ["카페", "CAFE"],
    ["cafe", "CAFE"],
    ["커피", "CAFE"],
  ];
  for (const [kw, code] of pairs) if (s.includes(kw)) return code;
  return "ETC";
}

/* ===== 입력 정규화 ===== */
function normalizeTel(t = "") {
  const digits = String(t).replace(/\D+/g, "");
  return digits.length >= 7 ? digits : "";
}

/** 외부에서 들어오는 장소 payload 정규화 */
function normalizePlacePayload(place = {}) {
  const name = String(place?.name ?? "").trim();
  const address = String(place?.address ?? "").trim();
  if (!name || !address) {
    const err = new Error("INVALID_PLACE_PAYLOAD");
    err.status = 400;
    throw err;
  }
  const toNumOrNull = (v) => {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  return {
    name,
    address,
    category: toFoodCategoryEnum(place?.category),
    telephone: normalizeTel(place?.telephone ?? ""),
    mapx: toNumOrNull(place?.mapx),
    mapy: toNumOrNull(place?.mapy),
  };
}

/* ===== 외부 place → 내부 식당 동기화(멱등) =====
   1) 전화번호(정규화된)가 있으면 전화번호로 매칭
   2) 없거나 실패하면 이름+주소(대소문자 무시, trim)로 매칭
   3) 둘 다 없으면 신규 생성
*/
export async function syncExternalPlace(placePayload) {
  const p = normalizePlacePayload(placePayload);

  if (p.telephone) {
    const byTel = await restRepo.findByTelephone(p.telephone);
    if (byTel) return { restaurantId: byTel.id, created: false };
  }

  const byNA = await restRepo.findByNameAddress(p.name, p.address);
  if (byNA) return { restaurantId: byNA.id, created: false };

  const created = await restRepo.create({ ...p, isSponsored: false });
  return { restaurantId: created.id, created: true };
}

/** 식당 보장: id 또는 외부 place 로 생성/찾기 */
export async function ensureRestaurant({ restaurantId, place }) {
  if (restaurantId == null && !place) {
    const err = new Error("RESTAURANT_ID_OR_PLACE_REQUIRED");
    err.status = 400;
    throw err;
  }
  if (restaurantId != null) {
    const found = await restRepo.findById(restaurantId);
    if (found) return { restaurantId, created: false };
    if (!place) {
      const err = new Error("RESTAURANT_NOT_FOUND");
      err.status = 404;
      throw err;
    }
  }
  return await syncExternalPlace(place);
}

/** ✅ DB 상세조회 + 즐겨찾기 여부 */
export async function getRestaurantDetail(restaurantId, userId) {
  const detail = await restRepo.findDetailById(restaurantId);
  if (!detail) {
    const err = new Error("RESTAURANT_NOT_FOUND");
    err.status = 404;
    throw err;
  }
  const favorite = await restRepo.isFavorite(userId, restaurantId);
  return { ...detail, isFavorite: favorite };
}

/** 네이버 외부 상세(메뉴/사진) → 내부 소비 스키마로 매핑 */
export async function getRestaurantExternalDetail(restaurantId) {
  const base = await restRepo.findById(restaurantId);
  if (!base) {
    const err = new Error("RESTAURANT_NOT_FOUND");
    err.status = 404;
    throw err;
  }

  let ext = { heroPhoto: null, menuPhotos: [], galleryPhotos: [] };
  try {
    ext = await getNaverMenusAndPhotos({
      name: base.name,
      address: base.address,
    });
  } catch (e) {
    console.warn("[NAVER][EXTERNAL-FAIL]", {
      restaurantId,
      name: base.name,
      address: base.address,
      err: e?.status || e?.message || String(e),
    });
  }

  return {
    restaurantId: base.id,
    name: base.name,
    address: base.address,
    telephone: String(base.telephone ?? "").trim(),
    category: toFoodCategoryEnum(base.category ?? ""),
    heroPhoto: ext.heroPhoto ?? null,
    menus: Array.isArray(ext.menuPhotos) ? ext.menuPhotos : [],
    photos: Array.isArray(ext.galleryPhotos) ? ext.galleryPhotos : [],
  };
}

/**
 * FE 탭 UI용 상세 페이로드 조합:
 * - header(상단 카드)
 * - tabs.info / tabs.menu / tabs.gallery / tabs.review
 */
export async function getRestaurantTabbedDetail(restaurantId, userId) {
  const base = await restRepo.findDetailById(restaurantId);
  if (!base) {
    const err = new Error("RESTAURANT_NOT_FOUND");
    err.status = 404;
    throw err;
  }

  const favorite = await restRepo.isFavorite(userId, restaurantId);

  // 외부(네이버) 메뉴/사진
  let external = { heroPhoto: null, menuPhotos: [], galleryPhotos: [] };
  try {
    external = await getNaverMenusAndPhotos({
      name: base.name,
      address: base.address,
    });
  } catch (e) {
    console.warn("[NAVER][EXTERNAL-FAIL]", e?.status || e?.message || e);
  }

  // 리뷰/갤러리 일부(초기 렌더용)
  const reviewsPaged = await restRepo.findRecentReviewsWithPhotos(
    restaurantId,
    { page: 1, size: 5 },
  );
  const galleryPaged = await restRepo.findGalleryPhotos(restaurantId, {
    page: 1,
    size: 8,
  });

  return {
    header: {
      id: base.id,
      name: base.name,
      category: base.category,
      telephone: base.telephone,
      address: base.address,
      ecoScore: base.stats?.ecoScore ?? null,
      reviewCount: base.stats?.reviews ?? 0,
      isFavorite: favorite,
      heroPhoto: external.heroPhoto ?? null,
    },
    tabs: {
      info: {
        address: base.address,
        telephone: base.telephone,
        ecoScore: base.stats?.ecoScore ?? null,
        stats: base.stats,
      },
      menu: {
        items: [], // 구조화된 메뉴 없음
        photos: external.menuPhotos ?? [],
      },
      gallery: {
        photos: (external.galleryPhotos ?? []).slice(0, 8), // 외부 8장 선반영
        dbPhotos: galleryPaged.items, // DB 사진
        pageInfo: galleryPaged.pageInfo,
      },
      review: {
        summary: {
          total: base.stats?.reviews ?? 0,
          avgEcoScore: base.stats?.ecoScore ?? null,
        },
        items: reviewsPaged.items,
        pageInfo: reviewsPaged.pageInfo,
      },
    },
  };
}

/** DB + NAVER 병합(상단 hero, 갤러리, 메뉴 사진 포함) */
export async function getRestaurantFullDetail({ restaurant }) {
  // DB 탭형 상세
  const db = await getRestaurantTabbedDetail(restaurant.id);

  // NAVER 외부 상세(장소/갤러리/메뉴 사진 번들)
  const ext = await buildExternalDetail({
    name: restaurant.name,
    address: restaurant.address,
    telephone: restaurant.telephone,
  });

  return {
    header: {
      id: restaurant.id,
      name: restaurant.name,
      category: restaurant.category,
      address: restaurant.address,
      telephone: restaurant.telephone,
      isFavorite: db.header?.isFavorite ?? false,
      heroPhoto: ext.heroPhoto ?? db.header?.heroPhoto ?? null,
      ecoScore: db.header?.ecoScore ?? null,
    },
    tabs: {
      info: {
        address: restaurant.address,
        telephone: restaurant.telephone,
        naverCategory: ext.place?.category ?? null, // buildExternalDetail가 place를 제공
      },
      // stats는 db.tabs.info.stats에 포함되어 있으므로 별도 섹션이 없다면 생략 가능
      menu: {
        items: [], // 구조화된 메뉴 없음
        photos: ext.menu?.photos ?? ext.menuPhotos ?? [], // buildExternalDetail/호환
      },
      gallery: {
        photos: ext.gallery?.photos ?? ext.galleryPhotos ?? [],
        dbPhotos: db.tabs?.gallery?.dbPhotos ?? [],
        pageInfo: ext.gallery?.pageInfo ?? {
          page: 1,
          size: ext.galleryPhotos?.length ?? 0,
          total: ext.galleryPhotos?.length ?? 0,
        },
      },
      review: db.tabs?.review ?? {
        summary: { total: 0, avgEcoScore: null },
        items: [],
        pageInfo: { page: 1, size: 5, total: 0 },
      },
    },
  };
}
