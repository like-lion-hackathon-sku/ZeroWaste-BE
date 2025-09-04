import express from 'express';
import { handleLoadImage } from '../controller/images.controller.js';
const router = express.Router({ mergeParams: true });
router.get("/:imageType/:fileName", handleLoadImage);
export default router;