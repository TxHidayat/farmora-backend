const path = require('path');
const fs = require('fs');

const pool = require('../config/database');

const {
    analyzePlantImage,
} = require('../services/geminiService');


/*
==================================================
GET CROP CYCLE MILIK USER
==================================================
*/

const getCropCycleForUser = async (
    cropCycleId,
    userId
) => {

    const [rows] =
        await pool.execute(
            `
            SELECT
                cc.id,
                cc.crop_name,
                cc.variety,

                f.id AS field_id,
                f.name AS field_name,

                farms.id AS farm_id,
                farms.name AS farm_name

            FROM crop_cycles cc

            INNER JOIN fields f
                ON f.id = cc.field_id

            INNER JOIN farms
                ON farms.id = f.farm_id

            WHERE
                cc.id = ?
                AND farms.user_id = ?

            LIMIT 1
            `,
            [
                cropCycleId,
                userId,
            ]
        );

    return rows[0] || null;
};


/*
==================================================
UPLOAD GAMBAR TANAMAN
==================================================

POST /api/ai-detection/images
*/

const uploadPlantImage = async (
    req,
    res
) => {

    try {

        const userId =
            req.user.userId;

        const {
            crop_cycle_id,
        } = req.body;


        /*
        ==========================================
        VALIDASI CROP CYCLE
        ==========================================
        */

        if (!crop_cycle_id) {

            return res.status(400).json({

                success: false,

                message:
                    'crop_cycle_id wajib diisi.',

            });

        }


        /*
        ==========================================
        VALIDASI FILE
        ==========================================
        */

        if (!req.file) {

            return res.status(400).json({

                success: false,

                message:
                    'Gambar tanaman wajib diupload.',

            });

        }


        /*
        ==========================================
        CEK CROP CYCLE MILIK USER
        ==========================================
        */

        const cropCycle =
            await getCropCycleForUser(
                crop_cycle_id,
                userId
            );


        if (!cropCycle) {

            return res.status(404).json({

                success: false,

                message:
                    'Crop cycle tidak ditemukan atau bukan milik user.',

            });

        }


        /*
        ==========================================
        PATH GAMBAR
        ==========================================
        */

        const imagePath = req.file.path
            .replace(/\\/g, '/');


        /*
        ==========================================
        SIMPAN KE DATABASE
        ==========================================
        */

        const [result] =
            await pool.execute(
                `
                INSERT INTO plant_images (
                    crop_cycle_id,
                    image_path,
                    image_name,
                    mime_type,
                    file_size
                )

                VALUES (?, ?, ?, ?, ?)
                `,
                [
                    crop_cycle_id,
                    imagePath,
                    req.file.originalname,
                    req.file.mimetype,
                    req.file.size,
                ]
            );


        /*
        ==========================================
        RESPONSE
        ==========================================
        */

        return res.status(201).json({

            success: true,

            message:
                'Gambar tanaman berhasil diupload.',

            data: {

                id:
                    result.insertId,

                crop_cycle_id:
                    Number(crop_cycle_id),

                crop_name:
                    cropCycle.crop_name,

                variety:
                    cropCycle.variety,

                farm_name:
                    cropCycle.farm_name,

                field_name:
                    cropCycle.field_name,

                image_path:
                    imagePath,

                image_name:
                    req.file.originalname,

                mime_type:
                    req.file.mimetype,

                file_size:
                    req.file.size,

            },

        });

    } catch (error) {

        console.error(
            'Upload plant image error:',
            error
        );

        return res.status(500).json({

            success: false,

            message:
                'Gagal mengupload gambar tanaman.',

            error:
                error.message,

        });

    }

};


/*
==================================================
ANALISIS GAMBAR DENGAN AI
==================================================

POST /api/ai-detection/images/:id/analyze
*/

const analyzeUploadedImage = async (
    req,
    res
) => {

    let reportId = null;


    try {

        const userId =
            req.user.userId;

        const imageId =
            req.params.id;


        /*
        ==========================================
        CARI GAMBAR
        ==========================================
        */

        const [rows] =
            await pool.execute(
                `
                SELECT

                    pi.id,

                    pi.image_path,

                    pi.image_name,

                    pi.crop_cycle_id,

                    cc.crop_name,

                    cc.variety,

                    f.name AS field_name,

                    farms.name AS farm_name

                FROM plant_images pi

                INNER JOIN crop_cycles cc
                    ON cc.id = pi.crop_cycle_id

                INNER JOIN fields f
                    ON f.id = cc.field_id

                INNER JOIN farms
                    ON farms.id = f.farm_id

                WHERE
                    pi.id = ?
                    AND farms.user_id = ?

                LIMIT 1
                `,
                [
                    imageId,
                    userId,
                ]
            );


        /*
        ==========================================
        GAMBAR TIDAK DITEMUKAN
        ==========================================
        */

        if (rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    'Gambar tanaman tidak ditemukan atau bukan milik user.',

            });

        }


        const image =
            rows[0];


        /*
        ==========================================
        CEK FILE FISIK
        ==========================================
        */

        const absoluteImagePath = path.isAbsolute(
            image.image_path
        )
            ? image.image_path
            : path.join(
                process.cwd(),
                image.image_path
            );


        if (!fs.existsSync(absoluteImagePath)) {

            return res.status(404).json({

                success: false,

                message:
                    'File gambar tidak ditemukan di server.',

                error:
                    absoluteImagePath,

            });

        }


        /*
        ==========================================
        BUAT AI REPORT
        ==========================================
        */

        const [reportResult] =
            await pool.execute(
                `
                INSERT INTO ai_reports (
                    plant_image_id,
                    status
                )

                VALUES (?, 'processing')
                `,
                [
                    image.id,
                ]
            );


        reportId =
            reportResult.insertId;


        /*
        ==========================================
        JALANKAN AI
        ==========================================
        */

        console.log('');
        console.log(
            '========================================'
        );
        console.log(
            'FARMORA AI ANALYSIS'
        );
        console.log(
            'Image ID:',
            image.id
        );
        console.log(
            'Crop:',
            image.crop_name
        );
        console.log(
            'Variety:',
            image.variety
        );
        console.log(
            'Image:',
            absoluteImagePath
        );
        console.log(
            '========================================'
        );


        const analysis =
            await analyzePlantImage(
                absoluteImagePath,
                image.crop_name,
                image.variety
            );


        /*
        ==========================================
        NORMALISASI CONFIDENCE
        ==========================================
        */

        let confidence =
            Number(
                analysis.confidence
            );


        if (!Number.isFinite(confidence)) {

            confidence = 0;

        }


        confidence =
            Math.max(
                0,
                Math.min(
                    100,
                    confidence
                )
            );


        /*
        ==========================================
        SIMPAN HASIL AI
        ==========================================
        */

        await pool.execute(
            `
            UPDATE ai_reports

            SET

                status = 'completed',

                diagnosis = ?,

                confidence = ?,

                result = ?,

                recommendation = ?,

                error_message = NULL

            WHERE id = ?
            `,
            [

                analysis.diagnosis ||
                'Tidak dapat ditentukan',

                confidence,

                JSON.stringify(
                    analysis
                ),

                analysis.recommendation ||
                null,

                reportId,

            ]
        );


        /*
        ==========================================
        RESPONSE BERHASIL
        ==========================================
        */

        return res.json({

            success: true,

            message:
                'Analisis AI berhasil.',

            data: {

                report_id:
                    reportId,

                image_id:
                    image.id,

                crop_cycle_id:
                    image.crop_cycle_id,

                crop_name:
                    image.crop_name,

                variety:
                    image.variety,

                farm_name:
                    image.farm_name,

                field_name:
                    image.field_name,

                image_name:
                    image.image_name,

                condition:
                    analysis.condition,

                diagnosis:
                    analysis.diagnosis,

                confidence:
                    confidence,

                symptoms:
                    analysis.symptoms,

                possible_causes:
                    analysis.possible_causes,

                recommendation:
                    analysis.recommendation,

                observation:
                    analysis.observation,

            },

        });

    } catch (error) {

        /*
        ==========================================
        LOG ERROR DETAIL
        ==========================================
        */

        console.error('');
        console.error(
            '========================================'
        );
        console.error(
            'AI ANALYSIS ERROR'
        );
        console.error(
            'Message:',
            error.message
        );
        console.error(
            'Stack:',
            error.stack
        );
        console.error(
            '========================================'
        );
        console.error('');


        /*
        ==========================================
        UPDATE REPORT MENJADI FAILED
        ==========================================
        */

        if (reportId) {

            try {

                await pool.execute(
                    `
                    UPDATE ai_reports

                    SET

                        status = 'failed',

                        error_message = ?

                    WHERE id = ?
                    `,
                    [
                        error.message,
                        reportId,
                    ]
                );

            } catch (updateError) {

                console.error(
                    'Failed to update AI report:',
                    updateError
                );

            }

        }


        /*
        ==========================================
        RESPONSE ERROR
        ==========================================
        */

        return res.status(500).json({

            success: false,

            message:
                'Analisis AI gagal.',

            error:
                error.message,

        });

    }

};


/*
==================================================
GET SEMUA GAMBAR TANAMAN
==================================================

GET /api/ai-detection/images
*/

const getPlantImages = async (
    req,
    res
) => {

    try {

        const userId =
            req.user.userId;


        const [rows] =
            await pool.execute(
                `
                SELECT

                    pi.id,

                    pi.crop_cycle_id,

                    pi.image_path,

                    pi.image_name,

                    pi.mime_type,

                    pi.file_size,

                    pi.created_at,

                    cc.crop_name,

                    cc.variety,

                    f.name AS field_name,

                    farms.name AS farm_name

                FROM plant_images pi

                INNER JOIN crop_cycles cc
                    ON cc.id = pi.crop_cycle_id

                INNER JOIN fields f
                    ON f.id = cc.field_id

                INNER JOIN farms
                    ON farms.id = f.farm_id

                WHERE farms.user_id = ?

                ORDER BY
                    pi.created_at DESC
                `,
                [
                    userId,
                ]
            );


        return res.json({

            success: true,

            data: rows,

        });

    } catch (error) {

        console.error(
            'Get plant images error:',
            error
        );


        return res.status(500).json({

            success: false,

            message:
                'Gagal mengambil gambar tanaman.',

            error:
                error.message,

        });

    }

};


/*
==================================================
GET HASIL ANALISIS AI
==================================================

GET /api/ai-detection/reports
*/

const getAiReports = async (
    req,
    res
) => {

    try {

        const userId =
            req.user.userId;


        const [rows] =
            await pool.execute(
                `
                SELECT

                    ar.id,

                    ar.plant_image_id,

                    ar.status,

                    ar.diagnosis,

                    ar.confidence,

                    ar.result,

                    ar.recommendation,

                    ar.error_message,

                    ar.created_at,

                    ar.updated_at,

                    pi.image_path,

                    pi.image_name,

                    cc.crop_name,

                    cc.variety,

                    f.name AS field_name,

                    farms.name AS farm_name

                FROM ai_reports ar

                INNER JOIN plant_images pi
                    ON pi.id = ar.plant_image_id

                INNER JOIN crop_cycles cc
                    ON cc.id = pi.crop_cycle_id

                INNER JOIN fields f
                    ON f.id = cc.field_id

                INNER JOIN farms
                    ON farms.id = f.farm_id

                WHERE farms.user_id = ?

                ORDER BY
                    ar.created_at DESC
                `,
                [
                    userId,
                ]
            );


        return res.json({

            success: true,

            data: rows,

        });

    } catch (error) {

        console.error(
            'Get AI reports error:',
            error
        );


        return res.status(500).json({

            success: false,

            message:
                'Gagal mengambil laporan AI.',

            error:
                error.message,

        });

    }

};


/*
==================================================
EXPORT
==================================================
*/

module.exports = {

    uploadPlantImage,

    analyzeUploadedImage,

    getPlantImages,

    getAiReports,

};