import dotenv from "dotenv";
import { setupSwagger } from "./config/swagger.js";
import { setupCommonError, setupExpress } from "./config/express.js";
import router from "./router/router.js";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = setupExpress();
const port = process.env.PORT;

setupSwagger(app);
app.use("/api", router); // 라우터 설정`
setupCommonError(app);
app.use("/images", express.static(path.join(__dirname, "public/images")));
app.get("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  // 예: 유저 정보 가져오는 코드
  const user = await prisma.user.findUnique({ where: { id: Number(id) } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  // user.profile에는 아래와 같이 URL이 저장되어 있어야 함
  // "https://zerowaste-be-9c49.onrender.com/images/profiles/IMG_1882.jpeg"
  res.json(user);
});

app.listen(port, () => {
  console.log(`서버 열림 - 포트 : ${port}`);
});
