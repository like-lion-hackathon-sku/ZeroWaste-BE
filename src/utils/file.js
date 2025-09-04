import fs from "fs";
import { v4 } from 'uuid';
const imageTypeDirectory = {
    "PROFILE": "./images/profiles",
    "REVIEW": "./images/reviews"
}
export const saveFile = (file, type) => {
    const fileName = `${v4()}.${file.mimetype.split("/").at(-1)}`
    fs.writeFileSync(`${imageTypeDirectory[type]}/${fileName}`, file.buffer);
    return fileName;
}
export const deleteFile = (fileName, type) => {
    try {
        fs.unlinkSync(`${imageTypeDirectory[type]}/${fileName}`);
        return true;
    }
    catch (err) {
        return false;
    }
}
export const loadFileBuffer = (fileName, type) => {
    try {
        const buffer = fs.readFileSync(`${imageTypeDirectory[type.toUpperCase()]}/${fileName}`);
        return buffer;
    } catch (err) {
        return null;
    }
}