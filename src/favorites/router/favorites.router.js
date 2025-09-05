// 위치: src/favorites/router/favorites.router.js
import { Router } from "express";
import { addByIdCtrl, addByExternalCtrl, removeCtrl, listCtrl } from "../controller/favorites.controller.js";

const r = Router();
/*
  #swagger.tags = ['Favorites']
  #swagger.security = [{ bearerAuth: [] }]
*/

r.get("/", 
  /* #swagger.summary = '내 즐겨찾기 목록' */ 
  listCtrl
);

r.put("/:restaurantId(\\d+)", 
  /* #swagger.summary = '즐겨찾기 추가(멱등, id 보유 시)' */
  addByIdCtrl
);

r.put("/", 
  /* 
    #swagger.summary = '즐겨찾기 추가(멱등, 외부 place 데이터만 있을 때)'
    #swagger.requestBody = { required: true, content: { "application/json": { schema: {
      type: 'object',
      required: ['name','address','mapx','mapy'],
      properties: {
        name: { type:'string' }, category: { type:'string' },
        address: { type:'string' }, telephone: { type:'string' },
        mapx: { type:'integer' }, mapy: { type:'integer' }
      }
    }}}}
  */
  addByExternalCtrl
);

r.delete("/:restaurantId(\\d+)", 
  /* #swagger.summary = '즐겨찾기 삭제' */
  removeCtrl
);

export default r;