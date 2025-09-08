import * as restRepo from "../repository/restaurants.repository.js";
import { getNaverMenusAndPhotos } from "./naver.service.js";

/** 카테고리 문자열 → ENUM 매핑 */
function toFoodCategoryEnum(input) {
  const s = String(input || "").toLowerCase();
  const pairs = [
    // 메인
    ["한식", "KOREAN"],
    ["korean", "KOREAN"],
    ["일식", "JAPANESE"],
    ["japanese", "JAPANESE"],
    ["중식", "CHINESE"],
    ["chinese", "CHINESE"],
    ["양식", "WESTERN"],
    ["western", "WESTERN"],
    ["이탈리아", "WESTERN"],
    // 패스트/분식/카페
    ["분식", "FASTFOOD"],
    ["패스트푸드", "FASTFOOD"],
    ["fastfood", "FASTFOOD"],
    ["버거", "FASTFOOD"],
    ["치킨", "FASTFOOD"],
    ["피자", "WESTERN"],
    ["카페", "CAFE"],
    ["cafe", "CAFE"],
    ["커피", "CAFE"],
    // 서브 카테고리 보강
    ["이자카야", "JAPANESE"],
    ["초밥", "JAPANESE"],
    ["스시", "JAPANESE"],
  ];
  for (const [kw, code] of pairs) if (s.includes(kw)) return code;
  return "ETC";
}

/* ===== 입력 정규화 ===== */
function normalizeTel(t = "") {
  // 숫자만 남기고 7자리 미만이면 무시 (무의미한 값으로 간주)
  const digits = String(t).replace(/\D+/g, "");
  return digits.length >= 7 ? digits : "";
}

/** 외부에서 들어오는 장소 payload 정규화 */
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
    // 전화번호는 develop 브랜치 로직(정규화) 채택
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

  // 1) 전화번호 우선
  if (p.telephone) {
    const byTel = await restRepo.findByTelephone(p.telephone);
    if (byTel) return { restaurantId: byTel.id, created: false };
  }

  // 2) 이름+주소(대소문자 무시) 매칭
  const byNA = await restRepo.findByNameAddress(p.name, p.address);
  if (byNA) {
    return { restaurantId: byNA.id, created: false };
  }

  // 3) 신규 생성 (telephone은 스키마상 required라 빈 문자열 저장 허용)
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

/** 네이버 외부 상세(메뉴/사진/전화/카테고리) 조회 */
export async function getRestaurantExternalDetail(restaurantId) {
  const base = await restRepo.findById(restaurantId);
  if (!base) {
    const err = new Error("RESTAURANT_NOT_FOUND");
    err.status = 404;
    throw err;
  }

  let ext = null;
  try {
    ext = await getNaverMenusAndPhotos({
      name: base.name,
      address: base.address,
    });
  } catch (e) {
    // 운영 분석 편의 위해 컨텍스트 포함
    console.warn("[NAVER][EXTERNAL-FAIL]", {
      restaurantId,
      name: base.name,
      address: base.address,
      err: e?.status || e?.message || String(e),
    });
    ext = {};
  }

  return {
    restaurantId: base.id,
    name: base.name,
    address: base.address,
    telephone: String(ext?.telephone ?? base.telephone ?? "").trim(),
    category: toFoodCategoryEnum(ext?.category ?? base.category ?? ""),
    menus: Array.isArray(ext?.menus) ? ext.menus : [],
    photos: Array.isArray(ext?.photos) ? ext.photos : [],
    placeId: ext?.placeId ?? null,
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
  let external = {};
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
    {
      page: 1,
      size: 5,
    },
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
      heroPhoto: external?.photos?.[0]?.url ?? null, // 상단 배너용 첫 사진
    },
    tabs: {
      info: {
        address: base.address,
        telephone: base.telephone,
        ecoScore: base.stats?.ecoScore ?? null,
        stats: base.stats,
      },
      menu: {
        items: (external?.menus ?? []).map((m) => ({
          name: m.name,
          price: m.price ?? null,
        })),
        sourcePlaceId: external?.placeId ?? null,
      },
      gallery: {
        photos: (external?.photos ?? []).slice(0, 8), // 외부 8장 선반영
        dbPhotos: galleryPaged.items, // DB에 저장된 사진 페이징
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
