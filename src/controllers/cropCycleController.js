const pool = require('../config/database');

// ==============================
// GET ALL CROP CYCLES
// ==============================
const getCropCycles = async (req, res) => {
    try {
        const userId = req.user.userId;

        const [cropCycles] = await pool.execute(
            `SELECT
                cc.id,
                cc.field_id,
                cc.crop_name,
                cc.variety,
                DATE_FORMAT(cc.planting_date, '%Y-%m-%d') AS planting_date,
                cc.plant_count,
                cc.status,
                DATE_FORMAT(cc.estimated_harvest_date, '%Y-%m-%d') AS estimated_harvest_date,
                cc.notes,
                cc.created_at,
                cc.updated_at,
                f.name AS field_name,
                farms.id AS farm_id,
                farms.name AS farm_name
             FROM crop_cycles cc
             INNER JOIN fields f
                ON f.id = cc.field_id
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE farms.user_id = ?
             ORDER BY cc.created_at DESC`,
            [userId]
        );

        return res.status(200).json({
            success: true,
            data: cropCycles
        });

    } catch (error) {
        console.error('Get crop cycles error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


// ==============================
// GET CROP CYCLE BY ID
// ==============================
const getCropCycleById = async (req, res) => {
    try {
        const userId = req.user.userId;
        const cropCycleId = req.params.id;

        const [cropCycles] = await pool.execute(
            `SELECT
                cc.id,
                cc.field_id,
                cc.crop_name,
                cc.variety,
                DATE_FORMAT(cc.planting_date, '%Y-%m-%d') AS planting_date,
                cc.plant_count,
                cc.status,
                DATE_FORMAT(cc.estimated_harvest_date, '%Y-%m-%d') AS estimated_harvest_date,
                cc.notes,
                cc.created_at,
                cc.updated_at,
                f.name AS field_name,
                farms.id AS farm_id,
                farms.name AS farm_name
             FROM crop_cycles cc
             INNER JOIN fields f
                ON f.id = cc.field_id
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE cc.id = ?
             AND farms.user_id = ?`,
            [cropCycleId, userId]
        );

        if (cropCycles.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Siklus tanaman tidak ditemukan'
            });
        }

        return res.status(200).json({
            success: true,
            data: cropCycles[0]
        });

    } catch (error) {
        console.error('Get crop cycle error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


// ==============================
// CREATE CROP CYCLE
// ==============================
const createCropCycle = async (req, res) => {
    try {
        const userId = req.user.userId;

        const {
            field_id,
            crop_name,
            variety,
            planting_date,
            plant_count,
            status,
            estimated_harvest_date,
            notes
        } = req.body;

        // Validasi input wajib
        if (!field_id || !crop_name || !planting_date) {
            return res.status(400).json({
                success: false,
                message: 'field_id, nama tanaman, dan tanggal tanam wajib diisi'
            });
        }

        // Validasi jumlah tanaman
        if (
            plant_count !== undefined &&
            plant_count !== null &&
            Number(plant_count) < 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Jumlah tanaman tidak boleh negatif'
            });
        }

        // Pastikan field milik user
        const [fields] = await pool.execute(
            `SELECT f.id
             FROM fields f
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE f.id = ?
             AND farms.user_id = ?`,
            [field_id, userId]
        );

        if (fields.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lahan tidak ditemukan atau bukan milik Anda'
            });
        }

        // Insert crop cycle
        const [result] = await pool.execute(
            `INSERT INTO crop_cycles
            (
                field_id,
                crop_name,
                variety,
                planting_date,
                plant_count,
                status,
                estimated_harvest_date,
                notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                field_id,
                crop_name.trim(),
                variety || null,
                planting_date,
                plant_count || null,
                status || 'direncanakan',
                estimated_harvest_date || null,
                notes || null
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Siklus tanaman berhasil ditambahkan',
            data: {
                id: result.insertId,
                field_id,
                crop_name: crop_name.trim(),
                variety: variety || null,
                planting_date,
                plant_count: plant_count || null,
                status: status || 'direncanakan',
                estimated_harvest_date: estimated_harvest_date || null,
                notes: notes || null
            }
        });

    } catch (error) {
        console.error('Create crop cycle error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


// ==============================
// UPDATE CROP CYCLE
// ==============================
const updateCropCycle = async (req, res) => {
    try {
        const userId = req.user.userId;
        const cropCycleId = req.params.id;

        const {
            field_id,
            crop_name,
            variety,
            planting_date,
            plant_count,
            status,
            estimated_harvest_date,
            notes
        } = req.body;

        // Validasi
        if (!field_id || !crop_name || !planting_date) {
            return res.status(400).json({
                success: false,
                message: 'field_id, nama tanaman, dan tanggal tanam wajib diisi'
            });
        }

        if (
            plant_count !== undefined &&
            plant_count !== null &&
            Number(plant_count) < 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Jumlah tanaman tidak boleh negatif'
            });
        }

        // Pastikan field milik user
        const [fields] = await pool.execute(
            `SELECT f.id
             FROM fields f
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE f.id = ?
             AND farms.user_id = ?`,
            [field_id, userId]
        );

        if (fields.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lahan tidak ditemukan atau bukan milik Anda'
            });
        }

        // Pastikan crop cycle milik user
        const [existingCropCycle] = await pool.execute(
            `SELECT cc.id
             FROM crop_cycles cc
             INNER JOIN fields f
                ON f.id = cc.field_id
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE cc.id = ?
             AND farms.user_id = ?`,
            [cropCycleId, userId]
        );

        if (existingCropCycle.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Siklus tanaman tidak ditemukan'
            });
        }

        // Update
        await pool.execute(
            `UPDATE crop_cycles
             SET
                field_id = ?,
                crop_name = ?,
                variety = ?,
                planting_date = ?,
                plant_count = ?,
                status = ?,
                estimated_harvest_date = ?,
                notes = ?
             WHERE id = ?`,
            [
                field_id,
                crop_name.trim(),
                variety || null,
                planting_date,
                plant_count || null,
                status || 'direncanakan',
                estimated_harvest_date || null,
                notes || null,
                cropCycleId
            ]
        );

        return res.status(200).json({
            success: true,
            message: 'Siklus tanaman berhasil diperbarui'
        });

    } catch (error) {
        console.error('Update crop cycle error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


// ==============================
// DELETE CROP CYCLE
// ==============================
const deleteCropCycle = async (req, res) => {
    try {
        const userId = req.user.userId;
        const cropCycleId = req.params.id;

        // Pastikan crop cycle milik user
        const [existingCropCycle] = await pool.execute(
            `SELECT cc.id
             FROM crop_cycles cc
             INNER JOIN fields f
                ON f.id = cc.field_id
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE cc.id = ?
             AND farms.user_id = ?`,
            [cropCycleId, userId]
        );

        if (existingCropCycle.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Siklus tanaman tidak ditemukan'
            });
        }

        await pool.execute(
            `DELETE FROM crop_cycles
             WHERE id = ?`,
            [cropCycleId]
        );

        return res.status(200).json({
            success: true,
            message: 'Siklus tanaman berhasil dihapus'
        });

    } catch (error) {
        console.error('Delete crop cycle error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


module.exports = {
    getCropCycles,
    getCropCycleById,
    createCropCycle,
    updateCropCycle,
    deleteCropCycle
};