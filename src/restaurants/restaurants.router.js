import { Router } from "express";
import {
  listNearbyCtrl,
  getDetailCtrl,
  getNaverExternalDetailCtrl,
  syncExternalPlaceCtrl,
} from "../controller/restaurants.controller.js";

const r = Router();

/** 지도 박스 내 목록 */
r.get("/nearby", listNearbyCtrl);

/** 상세(영속 DB) */
r.get("/:id(\\d+)", getDetailCtrl);

/** 네이버 placeId 상세 프록시(비영속) */
r.get("/externals/naver/:placeId", getNaverExternalDetailCtrl);

/** 외부 place → DB 멱등 동기화(전화번호→좌표근접) */
r.put("/sync", syncExternalPlaceCtrl);

export default r;