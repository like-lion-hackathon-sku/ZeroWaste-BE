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

const stripTags = (s = "") => String(s).replace(/<[^>]*>/g, "");

/**
 * 과거 호환: 키워드 문자열 기반 로컬검색
 * 사용처: nearby.controller.js → searchLocal(q, 5)
 */
export async function searchLocal(query, display = 5) {
  const { data } = await client.get(
    "https://openapi.naver.com/v1/search/local.json",
    { params: { query, display } },
  );

  return (data?.items ?? []).map((it) => ({
    // 컨트롤러/후속 로직에서 쓰는 공통 필드로 맞춤
    name: stripTags(it.title),
    title: stripTags(it.title), // 호환용
    category: stripTags(it.category),
    address: stripTags(it.address || it.roadAddress),
    mapx: Number(it.mapx) || null,
    mapy: Number(it.mapy) || null,
    link: it.link,
    telephone: stripTags(it.telephone || ""),
  }));
}

/**
 * (선택) 구조화 매칭용: 이름/주소/전화 기반 검색
 * 필요하면 이걸 다른 곳에서 직접 import해서 써.
 */
export async function naverLocalSearch({ name, address, telephone }) {
  const q = telephone
    ? `${name} ${telephone}`
    : `${name} ${address ?? ""}`.trim();

  const { data } = await client.get(
    "https://openapi.naver.com/v1/search/local.json",
    { params: { query: q, display: 5 } },
  );

  return (data?.items ?? []).map((it) => ({
    name: stripTags(it.title),
    title: stripTags(it.title),
    category: stripTags(it.category),
    address: stripTags(it.address || it.roadAddress),
    mapx: Number(it.mapx) || null,
    mapy: Number(it.mapy) || null,
    link: it.link,
    telephone: stripTags(it.telephone || ""),
  }));
}

/**
 * 이미지 검색 (기존 로직 유지)
 */
export async function naverImageSearch({ name, address }) {
  const baseQuery = `${name} ${address ?? ""}`.trim();
  const queries = [baseQuery, `${name} 메뉴`];

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

  // 중복 제거
  const seen = new Set();
  const uniq = all.filter((im) =>
    seen.has(im.link) ? false : (seen.add(im.link), true),
  );
  return uniq;
}

/**
 * 메뉴/갤러리 통합(키 이름 통일: heroPhoto, menuPhotos, galleryPhotos)
 */
export async function getNaverMenusAndPhotos({ name, address, telephone }) {
  const photos = await naverImageSearch({ name, address });
  const heroPhoto = photos[0]?.link ?? null;
  const menuPhotos = photos.filter((im) => /메뉴|menu/i.test(im.title));
  return { heroPhoto, menuPhotos, galleryPhotos: photos };
}
export async function buildExternalDetail({ name, address, telephone }) {
  const [locals, images] = await Promise.all([
    naverLocalSearch({ name, address, telephone }),
    naverImageSearch({ name, address }),
  ]);

  const heroPhoto = images[0]?.link ?? null;
  const menuPhotos = images.filter((im) => /메뉴|menu/i.test(im.title));

  return {
    place: locals?.[0] ?? null,
    heroPhoto,
    gallery: {
      photos: images,
      pageInfo: { page: 1, size: images.length, total: images.length },
    },
    menu: {
      items: [], // 구조화된 메뉴 없음 → 사진으로 대체
      photos: menuPhotos,
    },
  };
}
