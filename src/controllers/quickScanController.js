const path = require('path');
const fs = require('fs');

const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const pool = require('../config/database');
const { analyzeQuickPlantImage } = require('../services/geminiService');

// =========================================================
// QUICK PLANT SCAN
// =========================================================

const quickPlantScan = async (req, res) => {
    const userId = req.user.userId;

    try {
        // -----------------------------------------------------
        // VALIDASI FILE
        // -----------------------------------------------------

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Foto tanaman wajib diupload.',
            });
        }

        const absoluteImagePath = req.file.path;
        const uploadResult = await cloudinary.uploader.upload(absoluteImagePath, {
            folder: 'quick_scans',
        });
        const imageUrl = uploadResult.secure_url;
        const imagePath = path
            .relative(process.cwd(), absoluteImagePath)
            .replace(/\\/g, '/');



        console.log('Quick Scan file debug:', {
            filePath: req.file.path,
            absoluteImagePath,
            exists: fs.existsSync(absoluteImagePath),
        });



        // -----------------------------------------------------
        // SIMPAN DATA AWAL
        // -----------------------------------------------------

        const [insertResult] = await pool.execute(
            `
            INSERT INTO quick_scans (
                user_id,
                image_path,
                image_public_id,
                image_name,
                mime_type,
                file_size,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, 'processing')
            `,
            [
                userId,
                uploadResult.secure_url,
                uploadResult.public_id,
                req.file.originalname,
                req.file.mimetype,
                req.file.size,
            ]
        );

        const scanId = insertResult.insertId;

        console.log(
            `Quick Plant Scan dimulai. Scan ID: ${scanId}`
        );

        // -----------------------------------------------------
        // ANALISIS GEMINI (after file still exists)
        // -----------------------------------------------------
        try {
            const analysis = await analyzeQuickPlantImage(absoluteImagePath);

            // -----------------------------------------------------
            // SIMPAN HASIL ANALISIS
            // -----------------------------------------------------
            await pool.execute(
                `
                UPDATE quick_scans
                SET
                    status = 'completed',
                    plant_name = ?,
                    condition_status = ?,
                    diagnosis = ?,
                    confidence = ?,
                    result = ?,
                    recommendation = ?,
                    error_message = NULL,
                    image_public_id = ?
                WHERE id = ?
                  AND user_id = ?
                `,
                [
                    analysis.plant_name || analysis.plant || 'Tidak dapat diidentifikasi',
                    analysis.condition || 'uncertain',
                    analysis.diagnosis || 'Tidak dapat ditentukan',
                    analysis.confidence || 0,
                    JSON.stringify(analysis),
                    analysis.recommendation || 'Tidak ada rekomendasi.',
                    uploadResult.public_id,
                    scanId,
                    userId,
                ]
            );

            console.log(`Quick Plant Scan selesai. Scan ID: ${scanId}`);

            return res.status(200).json({
                success: true,
                message: 'Analisis tanaman berhasil.',
                data: {
                    scan_id: scanId,
                    image_url: imageUrl,
                    image_name: req.file.originalname,
                    plant_name: analysis.plant_name || analysis.plant || 'Tidak dapat diidentifikasi',
                    condition: analysis.condition || 'uncertain',
                    diagnosis: analysis.diagnosis || 'Tidak dapat ditentukan',
                    confidence: analysis.confidence || 0,
                    symptoms: analysis.symptoms || [],
                    possible_causes: analysis.possible_causes || [],
                    recommendation: analysis.recommendation || 'Tidak ada rekomendasi.',
                    observation: analysis.observation || '',
                    result: analysis,
                },
            });
        } catch (analysisError) {
            // -------------------------------------------------
            // GAGAL ANALISIS
            // -------------------------------------------------
            console.error('Quick Plant Scan analysis error:', analysisError);

            // Cleanup Cloudinary asset to avoid orphaned image
            try {
                await cloudinary.uploader.destroy(uploadResult.public_id);
                console.log('Orphan Cloudinary image removed after Gemini failure');
            } catch (cloudErr) {
                console.warn('Failed to delete Cloudinary image after Gemini error:', cloudErr);
            }

            await pool.execute(
                `
                UPDATE quick_scans
                SET
                    status = 'failed',
                    error_message = ?
                WHERE id = ?
                  AND user_id = ?
                `,
                [analysisError.message, scanId, userId]
            );

            return res.status(500).json({
                success: false,
                message: 'Gagal menganalisis gambar tanaman.',
                error: analysisError.message,
            });
        } finally {
            // Ensure temporary file removal after analysis (success or failure)
            try {
                fs.unlinkSync(absoluteImagePath);
                console.log('Temporary file removed after Gemini processing:', absoluteImagePath);
            } catch (cleanupError) {
                console.warn('Failed to delete temporary file after Gemini processing:', cleanupError);
            }
        }

    } catch (error) {
        console.error(
            'Quick Plant Scan controller error:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Terjadi kesalahan pada Quick Plant Scan.',
            error: error.message,
        });
    }
};

// =========================================================
// GET QUICK SCAN HISTORY
// =========================================================

const getQuickScans = async (req, res) => {
    const userId = req.user.userId;

    try {
        const [rows] = await pool.execute(
            `
            SELECT
                id,
                image_path,
                image_name,
                mime_type,
                file_size,
                status,
                plant_name,
                condition_status,
                diagnosis,
                confidence,
                result,
                recommendation,
                error_message,
                created_at,
                updated_at
            FROM quick_scans
            WHERE user_id = ?
            ORDER BY created_at DESC
            `,
            [userId]
        );

        return res.status(200).json({
            success: true,
            data: rows,
        });

    } catch (error) {
        console.error(
            'Get quick scan history error:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Gagal mengambil riwayat Quick Scan.',
            error: error.message,
        });
    }
};

// =========================================================
// DELETE ONE QUICK SCAN
// =========================================================

const deleteQuickScan = async (req, res) => {
    const userId = req.user.userId;
    const scanId = req.params.id;

    try {
        // -----------------------------------------------------
        // VALIDASI ID
        // -----------------------------------------------------

        if (!scanId || Number.isNaN(Number(scanId))) {
            return res.status(400).json({
                success: false,
                message:
                    'ID riwayat Quick Scan tidak valid.',
            });
        }

        // -----------------------------------------------------
        // AMBIL DATA SCAN
        // -----------------------------------------------------

        const [rows] = await pool.execute(
            `
            SELECT
                id,
                image_path,
                image_public_id
            FROM quick_scans
            WHERE id = ?
              AND user_id = ?
            LIMIT 1
            `,
            [
                scanId,
                userId,
            ]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    'Riwayat Quick Scan tidak ditemukan.',
            });
        }

        const scan = rows[0];

        // -----------------------------------------------------
        // HAPUS DATABASE
        // -----------------------------------------------------

        await pool.execute(
            `
            DELETE FROM quick_scans
            WHERE id = ?
              AND user_id = ?
            `,
            [
                scanId,
                userId,
            ]
        );

        // -----------------------------------------------------
        // HAPUS FILE GAMBAR
        // -----------------------------------------------------

        if (scan.image_path && scan.image_path.startsWith('http') && scan.image_public_id) {
            // Delete from Cloudinary
            cloudinary.uploader.destroy(scan.image_public_id, (error, result) => {
                if (error) {
                    console.error('Cloudinary deletion error:', error);
                } else {
                    console.log('Cloudinary image deleted:', result);
                }
            });
        } else if (scan.image_path && !scan.image_path.startsWith('http')) {
            const imagePath = path.resolve(scan.image_path);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log(`File Quick Scan dihapus: ${imagePath}`);
            }
        }

        return res.status(200).json({
            success: true,
            message:
                'Riwayat Quick Scan berhasil dihapus.',
        });

    } catch (error) {
        console.error(
            'Delete quick scan error:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Gagal menghapus riwayat Quick Scan.',
            error: error.message,
        });
    }
};

// =========================================================
// DELETE ALL QUICK SCANS
// =========================================================

const deleteAllQuickScans = async (req, res) => {
    const userId = req.user.userId;

    try {
        // -----------------------------------------------------
        // AMBIL SEMUA FILE GAMBAR MILIK USER
        // -----------------------------------------------------

        const [rows] = await pool.execute(
            `
            SELECT
                id,
                image_path,
                image_public_id
            FROM quick_scans
            WHERE user_id = ?
            `,
            [userId]
        );

        // -----------------------------------------------------
        // JIKA TIDAK ADA DATA
        // -----------------------------------------------------

        if (rows.length === 0) {
            return res.status(200).json({
                success: true,
                message:
                    'Tidak ada riwayat Quick Scan yang perlu dihapus.',
                deleted_count: 0,
            });
        }

        // -----------------------------------------------------
        // HAPUS SEMUA DATA DATABASE
        // -----------------------------------------------------

        const [deleteResult] =
            await pool.execute(
                `
                DELETE FROM quick_scans
                WHERE user_id = ?
                `,
                [userId]
            );

        // -----------------------------------------------------
        // HAPUS FILE GAMBAR
        // -----------------------------------------------------

        let deletedFiles = 0;

        for (const scan of rows) {
            if (!scan.image_path) {
                continue;
            }

            try {
            if (scan.image_path && scan.image_path.startsWith('http') && scan.image_public_id) {
                // Delete from Cloudinary
                cloudinary.uploader.destroy(scan.image_public_id, (error, result) => {
                    if (error) {
                        console.error('Cloudinary deletion error:', error);
                    } else {
                        console.log('Cloudinary image deleted:', result);
                    }
                });
            } else if (scan.image_path && !scan.image_path.startsWith('http')) {
                const imagePath = path.resolve(scan.image_path);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                    deletedFiles++;
                }
            }
            } catch (fileError) {
                console.error(
                    `Gagal menghapus file Quick Scan ${scan.image_path}:`,
                    fileError.message
                );
            }
        }

        console.log(
            `Semua Quick Scan user ${userId} berhasil dihapus. ` +
            `Database: ${deleteResult.affectedRows}, ` +
            `File: ${deletedFiles}`
        );

        return res.status(200).json({
            success: true,
            message:
                'Semua riwayat Quick Scan berhasil dihapus.',
            deleted_count:
                deleteResult.affectedRows,
            deleted_files:
                deletedFiles,
        });

    } catch (error) {
        console.error(
            'Delete all quick scans error:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Gagal menghapus seluruh riwayat Quick Scan.',
            error: error.message,
        });
    }
};

// =========================================================
// EXPORT
// =========================================================

module.exports = {
    quickPlantScan,
    getQuickScans,
    deleteQuickScan,
    deleteAllQuickScans,
};