import { StatusCodes } from "http-status-codes";
import { imagesLoadRequestDto } from "../dto/request/images.request.dto.js";
import { loadImageData } from "../service/images.service.js";

export const handleLoadImage = async (req, res, next) => {
    /*
        #swagger.summary = "이미지 로드"
        #swagger.tags = ["Images"]
        #swagger.description = "업로드한 이미지를 로드합니다."
        #swagger.parameters["imageType"] = {
            in:"path",
            description:"이미지 타입 (profile, review)",
            required : true,
            example: "profile"
        }
        #swagger.parameters["fileName"] = {
            in:"path",
            description:"이미지 파일 이름",
            required : true,
            example: "filename.jpeg"
        }
    */
    const image = await loadImageData(imagesLoadRequestDto(req.params));
    console.log(image);
    res.writeHead(StatusCodes.OK, { "Content-Type": image.mimeType }).end(image.image);
}