// 위치: src/utils/file.js
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";

/* 루트 및 타입 디렉터리 */
const ROOT = process.cwd();
const IMAGE_ROOT = path.join(ROOT, "images"); // 기존 구조 유지: ./images/profiles, ./images/reviews

const imageTypeDirectory = {
  PROFILE: path.join(IMAGE_ROOT, "profiles"),
  REVIEW: path.join(IMAGE_ROOT, "reviews"),
};

const ALLOWED_EXTS = new Set(["jpg", "jpeg", "png", "webp"]);

const normalizeType = (t) => String(t || "").toUpperCase();
const safeBaseName = (name) => path.basename(String(name || "")); // ../ 방지

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function extFromMimetypeOrName(mimetype, originalName) {
  const m = String(mimetype || "")
    .split("/")
    .pop()
    ?.toLowerCase();
  let ext = m && ALLOWED_EXTS.has(m) ? m : "";
  if (!ext) {
    const fromName = (originalName || "").split(".").pop()?.toLowerCase();
    if (fromName && ALLOWED_EXTS.has(fromName)) ext = fromName;
  }
  if (!ext)
    throw new Error("Unsupported file type (allowed: jpg/jpeg/png/webp)");
  // 통일: jpg -> jpeg
  return ext === "jpg" ? "jpeg" : ext;
}

function dirFor(type) {
  const key = normalizeType(type);
  const dir = imageTypeDirectory[key];
  if (!dir) throw new Error(`Unknown image type: ${type}`);
  return dir;
}

/** 파일 저장: return 저장된 fileName */
export const saveFile = async (file, type) => {
  if (!file?.buffer) throw new Error("No file buffer");
  const ext = extFromMimetypeOrName(file.mimetype, file.originalname);
  const fileName = `${uuidv4()}.${ext}`;

  const targetDir = dirFor(type);
  ensureDirSync(targetDir);

  const fullPath = path.join(targetDir, fileName);
  await fsp.writeFile(fullPath, file.buffer);
  return fileName;
};

/** 파일 삭제: boolean */
export const deleteFile = async (fileName, type) => {
  try {
    const targetDir = dirFor(type);
    const fullPath = path.join(targetDir, safeBaseName(fileName));
    await fsp.unlink(fullPath);
    return true;
  } catch {
    return false;
  }
};

/** 파일 로드: Buffer | null */
export const loadFileBuffer = (fileName, type) => {
  try {
    const targetDir = dirFor(type);
    const fullPath = path.join(targetDir, safeBaseName(fileName));
    return fs.readFileSync(fullPath);
  } catch {
    return null;
  }
};

/** (옵션) 공개 URL 생성: 로드 라우터 경로와 맞춤 */
export const publicUrlFor = ({ type, name }) =>
  `/api/images/${encodeURIComponent(normalizeType(type).toLowerCase())}/${encodeURIComponent(safeBaseName(name))}`;
export const saveFileBuffer = async ({ type, name, buffer }) => {
  if (!buffer) throw new Error("No file buffer");
  const targetDir = dirFor(type); // 이미 위에 정의되어 있음
  ensureDirSync(targetDir); // 이미 위에 정의되어 있음
  const fullPath = path.join(targetDir, safeBaseName(name)); // 이미 위에 정의
  await fsp.writeFile(fullPath, buffer);
  return name;
};
