const express = require('express');

const authenticateToken =
    require('../middleware/authMiddleware');

const {
    demoBlockMiddleware,
    demoAiBlockMiddleware
} = require('../middleware/demoMiddleware');

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
AUTHENTICATION & DEMO RESTRICTION
==================================================
*/

router.use(
    authenticateToken
);

router.use(
    demoBlockMiddleware
);


/*
==================================================
UPLOAD GAMBAR
==================================================
*/

router.post(
    '/images',
    demoAiBlockMiddleware,
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
    demoAiBlockMiddleware,
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