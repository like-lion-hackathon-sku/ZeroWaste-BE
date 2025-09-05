import express from 'express';
const router = express.Router({ mergeParams: true });
router.get('/', (req, res, next) => {
    res.send("badges");
});
export default router;