const path = require('path');
const fs = require('fs');

const pool = require('../config/database');

const {
    analyzeQuickPlantImage,
} = require('../services/geminiService');

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

        const imagePath = path
            .relative(process.cwd(), absoluteImagePath)
            .replace(/\\/g, '/');

        // -----------------------------------------------------
        // CEK FILE FISIK
        // -----------------------------------------------------

        if (!fs.existsSync(absoluteImagePath)) {
            return res.status(500).json({
                success: false,
                message: 'File gambar tidak ditemukan.',
            });
        }

        // -----------------------------------------------------
        // SIMPAN DATA AWAL
        // -----------------------------------------------------

        const [insertResult] = await pool.execute(
            `
            INSERT INTO quick_scans (
                user_id,
                image_path,
                image_name,
                mime_type,
                file_size,
                status
            )
            VALUES (?, ?, ?, ?, ?, 'processing')
            `,
            [
                userId,
                imagePath.replace(/\\/g, '/'),
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
        // ANALISIS GEMINI
        // -----------------------------------------------------

        try {
            const analysis =
                await analyzeQuickPlantImage(
                    absoluteImagePath
                );

            const result = analysis.result || {};

            const plantName =
                result.plant_name ||
                result.plant ||
                'Tidak dapat diidentifikasi';

            const condition =
                result.condition ||
                'uncertain';

            const diagnosis =
                result.diagnosis ||
                'Tidak dapat ditentukan';

            const confidence =
                Number(result.confidence) || 0;

            const recommendation =
                result.recommendation ||
                'Tidak ada rekomendasi.';

            // -------------------------------------------------
            // SIMPAN HASIL ANALISIS
            // -------------------------------------------------

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
                    error_message = NULL
                WHERE id = ?
                  AND user_id = ?
                `,
                [
                    plantName,
                    condition,
                    diagnosis,
                    confidence,
                    JSON.stringify(result),
                    recommendation,
                    scanId,
                    userId,
                ]
            );

            console.log(
                `Quick Plant Scan selesai. Scan ID: ${scanId}`
            );

            return res.status(200).json({
                success: true,
                message:
                    'Analisis tanaman berhasil.',
                data: {
                    scan_id: scanId,

                    image_path:
                        imagePath.replace(
                            /\\/g,
                            '/'
                        ),

                    image_name:
                        req.file.originalname,

                    plant_name:
                        plantName,

                    condition:
                        condition,

                    diagnosis:
                        diagnosis,

                    confidence:
                        confidence,

                    symptoms:
                        result.symptoms || [],

                    possible_causes:
                        result.possible_causes ||
                        [],

                    recommendation:
                        recommendation,

                    observation:
                        result.observation ||
                        '',

                    result,
                },
            });

        } catch (analysisError) {
            // -------------------------------------------------
            // GAGAL ANALISIS
            // -------------------------------------------------

            console.error(
                'Quick Plant Scan analysis error:',
                analysisError
            );

            await pool.execute(
                `
                UPDATE quick_scans
                SET
                    status = 'failed',
                    error_message = ?
                WHERE id = ?
                  AND user_id = ?
                `,
                [
                    analysisError.message,
                    scanId,
                    userId,
                ]
            );

            return res.status(500).json({
                success: false,
                message:
                    'Gagal menganalisis gambar tanaman.',
                error:
                    analysisError.message,
            });
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
                image_path
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

        if (scan.image_path) {
            const imagePath =
                path.resolve(
                    scan.image_path
                );

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);

                console.log(
                    `File Quick Scan dihapus: ${imagePath}`
                );
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
                image_path
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
                const imagePath =
                    path.resolve(
                        scan.image_path
                    );

                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(
                        imagePath
                    );

                    deletedFiles++;
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