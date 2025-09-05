import { FileNotFoundError } from "../../error.js";
import { loadFileBuffer } from "../../utils/file.js"
import { imagesLoadResponseDto } from "../dto/response/images.response.dto.js"

export const loadImageData = async (data) => {
    const image = loadFileBuffer(data.name, data.type)
    const mimeType = `image/${data.name.split(".").at(-1)}`;
    if (!image) throw new FileNotFoundError("파일을 찾을 수 없습니다.", data);
    return imagesLoadResponseDto({ image, mimeType });
}