// src/restaurants/service/naver.service.js
import "dotenv/config";
import axios from "axios";

const NAVER_ID = process.env.NAVER_CLIENT_ID ?? "";
const NAVER_SECRET = process.env.NAVER_CLIENT_SECRET ?? "";

const client = axios.create({
  headers: {
    "X-Naver-Client-Id": NAVER_ID,
    "X-Naver-Client-Secret": NAVER_SECRET,
  },
  timeout: 5000,
});

/** 태그 제거 */
const stripTags = (s = "") => String(s).replace(/<[^>]*>/g, "");

/** 1) 네이버 로컬 검색: 이름+주소(또는 전화)로 place 후보 식별 */
export async function naverLocalSearch({ name, address, telephone }) {
  const q = telephone
    ? `${name} ${telephone}`
    : `${name} ${address ?? ""}`.trim();

  const { data } = await client.get(
    "https://openapi.naver.com/v1/search/local.json",
    { params: { query: q, display: 5 } },
  );

  const items = (data?.items ?? []).map((it) => ({
    title: stripTags(it.title),
    category: stripTags(it.category),
    address: stripTags(it.address || it.roadAddress),
    mapx: Number(it.mapx) || null,
    mapy: Number(it.mapy) || null,
    link: it.link, // place.naver.com으로 가는 링크(식별에 활용)
    telephone: stripTags(it.telephone || ""),
  }));
  return items;
}

/** 2) 네이버 이미지 검색: 사진/메뉴 사진 추출 */
export async function naverImageSearch({ name, address }) {
  // 메뉴/음식 위주 사진을 뽑고 싶으면 키워드 가중
  const baseQuery = `${name} ${address ?? ""}`.trim();
  const candidates = [
    baseQuery,
    `${baseQuery} 메뉴`,
    `${name} 메뉴`,
    `${name} 내부`,
  ];

  // 간단히 2회만 호출 (너무 많이 부르면 쿼터 소모↑)
  const queries = candidates.slice(0, 2);

  const all = [];
  for (const q of queries) {
    const { data } = await client.get(
      "https://openapi.naver.com/v1/search/image",
      { params: { query: q, display: 10, sort: "sim" } },
    );
    const imgs = (data?.items ?? []).map((it) => ({
      title: stripTags(it.title),
      thumbnail: it.thumbnail || it.thumbnailUrl || it.link,
      link: it.link,
      size: {
        width: it.sizewidth ? Number(it.sizewidth) : null,
        height: it.sizeheight ? Number(it.sizeheight) : null,
      },
    }));
    all.push(...imgs);
  }

  // 중복 제거(링크 기준)
  const uniq = [];
  const seen = new Set();
  for (const im of all) {
    if (seen.has(im.link)) continue;
    seen.add(im.link);
    uniq.push(im);
  }
  return uniq;
}

/** 3) 외부 상세 조립: heroPhoto, gallery, (menu는 '메뉴 사진'으로 대체) */
export async function buildExternalDetail({ name, address, telephone }) {
  const [locals, images] = await Promise.all([
    naverLocalSearch({ name, address, telephone }),
    naverImageSearch({ name, address }),
  ]);

  const heroPhoto = images[0]?.link ?? null;

  // 메뉴 사진만 별도로 뽑고 싶으면 간단 필터 (제목에 '메뉴' 포함 등)
  const menuPhotos = images.filter((im) => /메뉴|menu/i.test(im.title));

  return {
    place: locals[0] ?? null, // 가장 유사한 후보 1개
    heroPhoto,
    gallery: {
      photos: images,
      pageInfo: { page: 1, size: images.length, total: images.length },
    },
    // 구조화된 항목이 없으므로 'items'가 아니라 'menuPhotos'로 제공
    menu: {
      items: [], // 구조화 불가 → 빈 배열
      photos: menuPhotos, // 메뉴 사진으로 대체
    },
  };
}
export async function getNaverMenusAndPhotos({ name, address, telephone }) {
  // 이름·주소 기반으로 이미지 검색해서
  // 메뉴/갤러리 사진 묶음을 반환
  const base = [`${name} ${address ?? ""}`.trim(), `${name} 메뉴`];

  const all = [];
  for (const q of base) {
    const { data } = await client.get(
      "https://openapi.naver.com/v1/search/image",
      { params: { query: q, display: 10, sort: "sim" } },
    );
    const imgs = (data?.items ?? []).map((it) => ({
      title: stripTags(it.title),
      link: it.link,
      thumbnail: it.thumbnail || it.thumbnailUrl || it.link,
    }));
    all.push(...imgs);
  }

  // 중복 제거
  const seen = new Set();
  const photos = all.filter((im) =>
    seen.has(im.link) ? false : (seen.add(im.link), true),
  );

  // 제목에 '메뉴' 포함한 것만 메뉴 사진으로 분류
  const menuPhotos = photos.filter((im) => /메뉴|menu/i.test(im.title));

  return {
    heroPhoto: photos[0]?.link ?? null,
    menuPhotos,
    galleryPhotos: photos,
  };
}
export { naverLocalSearch as searchLocal };
