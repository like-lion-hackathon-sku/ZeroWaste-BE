import dotenv from "dotenv";
import { setupSwagger } from "./config/swagger.js";
import { setupCommonError, setupExpress } from "./config/express.js";
import router from "./router/router.js";
dotenv.config();
import { tokenBridge } from "./auth/middleware/token-bridge.middleware.js";

const app = setupExpress();
const port = process.env.PORT;

setupSwagger(app);
app.use(tokenBridge);
app.use("/api", router); // 라우터 설정`
setupCommonError(app);
app.listen(port, () => {
  console.log(`서버 열림 - 포트 : ${port}`);
});
