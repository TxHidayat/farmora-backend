const express = require('express');

const authenticateToken =
    require('../middleware/authMiddleware');

const upload =
    require('../middleware/uploadMiddleware');

const {
    uploadPlantImage,
    analyzeUploadedImage,
    getPlantImages,
    getAiReports,
} = require('../controllers/aiDetectionController');


const router =
    express.Router();


/*
==================================================
AUTHENTICATION
==================================================
*/

router.use(
    authenticateToken
);


/*
==================================================
UPLOAD GAMBAR
==================================================
*/

router.post(
    '/images',
    upload.single('image'),
    uploadPlantImage
);


/*
==================================================
ANALISIS AI
==================================================
*/

router.post(
    '/images/:id/analyze',
    analyzeUploadedImage
);


/*
==================================================
GET GAMBAR
==================================================
*/

router.get(
    '/images',
    getPlantImages
);


/*
==================================================
GET HASIL AI
==================================================
*/

router.get(
    '/reports',
    getAiReports
);


module.exports = router;