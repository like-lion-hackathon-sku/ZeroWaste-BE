// 위치: src/images/service/images.service.js
import { FileNotFoundError, BadRequestError } from "../../error.js";
import {
  loadFileBuffer,
  saveFileBuffer,
  publicUrlFor,
} from "../../utils/file.js";
import {
  imagesLoadResponseDto,
  imagesAnalyzeResponseDto,
  imagesUploadResponseDto,
} from "../dto/response/images.response.dto.js";
import { openai } from "../../utils/openai.js";

/* ===== 업로드 ===== */
export const uploadImageData = async (data) => {
  if (!data?.buffer || !data?.mimeType || !data?.originalName) {
    throw new BadRequestError("파일이 없습니다. (field: file)");
  }
  const ext = (data.originalName.split(".").pop() || "").toLowerCase();
  const allowed = new Set(["jpg", "jpeg", "png", "webp"]);
  if (!allowed.has(ext)) {
    throw new BadRequestError(
      "지원하지 않는 확장자입니다. (jpg/jpeg/png/webp)",
    );
  }

  // 파일명: {timestamp}-{rand}.{ext}
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await saveFileBuffer({
    type: data.type,
    name: fileName,
    buffer: data.buffer,
  });

  return imagesUploadResponseDto({
    type: data.type,
    fileName,
    url: publicUrlFor({ type: data.type, name: fileName }),
  });
};

/* ===== 로드 ===== */
export const loadImageData = async (data) => {
  const image = loadFileBuffer(data.name, data.type);
  const mimeType = `image/${data.name.split(".").at(-1)}`;
  if (!image) throw new FileNotFoundError("파일을 찾을 수 없습니다.", data);
  return imagesLoadResponseDto({ image, mimeType });
};

/* ===== 분석 ===== */
export const analyzeImageData = async (data) => {
  const image = loadFileBuffer(data.name, data.type);
  if (!image) throw new FileNotFoundError("파일을 찾을 수 없습니다.", data);

  const ext = String(data.name.split(".").at(-1) || "").toLowerCase();
  const allowed = new Set(["jpg", "jpeg", "png", "webp"]);
  if (!allowed.has(ext)) {
    throw new BadRequestError(
      "지원하지 않는 이미지 확장자입니다. (jpg/jpeg/png/webp)",
      { ext },
    );
  }
  const mimeType =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  const b64 = image.toString("base64");
  const dataUrl = `data:${mimeType};base64,${b64}`;

  const SYSTEM_PROMPT = `
너는 음식 사진을 보고 '잔반 정도'를 평가하는 평가자야.
- 음식이 전혀 없는 사진(풍경, 사람, 물건 등)은 정확히 "NOT_FOOD"만 반환.
- 음식 사진이면 반드시 아래 JSON을 반환 (키/타입/범위 엄수):
  {
    "score": <1~5 사이의 정수>,
    "summary": "<한국어 한줄평>"
  }
  규칙:
  - 새로 차려진 음식(잔반 거의 없음)은 1점
  - 거의 다 먹은 빈 그릇(잔반 없음)은 5점
  - 반드시 하나만 반환: "NOT_FOOD" 또는 위 JSON (둘 다 금지).
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 300,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "이 이미지를 보고 음식 잔반 정도를 평가해줘." },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  const text = completion?.choices?.[0]?.message?.content?.trim() ?? "";
  if (text === "NOT_FOOD") {
    return imagesAnalyzeResponseDto({ type: "NOT_FOOD" });
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BadRequestError("모델 응답 파싱 실패", { raw: text });
  }

  const valid =
    parsed &&
    Number.isInteger(parsed.score) &&
    parsed.score >= 1 &&
    parsed.score <= 5 &&
    typeof parsed.summary === "string" &&
    parsed.summary.length > 0;

  if (!valid) throw new BadRequestError("응답 스키마 위반", { got: parsed });

  return imagesAnalyzeResponseDto({
    type: "FOOD",
    score: parsed.score,
    summary: parsed.summary,
  });
};
