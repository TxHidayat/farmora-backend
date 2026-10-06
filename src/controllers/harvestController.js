const pool = require('../config/database');

// ==============================
// GET ALL HARVESTS
// ==============================
const getHarvests = async (req, res) => {
    try {
        const userId = req.user.userId;

        const [harvests] = await pool.execute(
            `SELECT
                h.id,
                h.crop_cycle_id,
                DATE_FORMAT(h.harvest_date, '%Y-%m-%d') AS harvest_date,
                h.quantity,
                h.unit,
                h.grade,
                h.price_per_unit,
                h.notes,
                h.created_at,
                h.updated_at,
                cc.crop_name,
                cc.variety,
                f.id AS field_id,
                f.name AS field_name,
                farms.id AS farm_id,
                farms.name AS farm_name
             FROM harvests h
             INNER JOIN crop_cycles cc
                ON cc.id = h.crop_cycle_id
             INNER JOIN fields f
                ON f.id = cc.field_id
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE farms.user_id = ?
             ORDER BY h.harvest_date DESC, h.created_at DESC`,
            [userId]
        );

        return res.status(200).json({
            success: true,
            data: harvests
        });

    } catch (error) {
        console.error('Get harvests error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


// ==============================
// GET HARVEST BY ID
// ==============================
const getHarvestById = async (req, res) => {
    try {
        const userId = req.user.userId;
        const harvestId = req.params.id;

        const [harvests] = await pool.execute(
            `SELECT
                h.id,
                h.crop_cycle_id,
                DATE_FORMAT(h.harvest_date, '%Y-%m-%d') AS harvest_date,
                h.quantity,
                h.unit,
                h.grade,
                h.price_per_unit,
                h.notes,
                h.created_at,
                h.updated_at,
                cc.crop_name,
                cc.variety,
                f.id AS field_id,
                f.name AS field_name,
                farms.id AS farm_id,
                farms.name AS farm_name
             FROM harvests h
             INNER JOIN crop_cycles cc
                ON cc.id = h.crop_cycle_id
             INNER JOIN fields f
                ON f.id = cc.field_id
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE h.id = ?
             AND farms.user_id = ?`,
            [harvestId, userId]
        );

        if (harvests.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Data panen tidak ditemukan'
            });
        }

        return res.status(200).json({
            success: true,
            data: harvests[0]
        });

    } catch (error) {
        console.error('Get harvest error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


// ==============================
// CREATE HARVEST
// ==============================
const createHarvest = async (req, res) => {
    try {
        const userId = req.user.userId;

        const {
            crop_cycle_id,
            harvest_date,
            quantity,
            unit,
            grade,
            price_per_unit,
            notes
        } = req.body;

        // Validasi
        if (
            !crop_cycle_id ||
            !harvest_date ||
            quantity === undefined ||
            quantity === null ||
            !unit
        ) {
            return res.status(400).json({
                success: false,
                message: 'crop_cycle_id, tanggal panen, jumlah, dan satuan wajib diisi'
            });
        }

        // Validasi quantity
        if (Number(quantity) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Jumlah panen harus lebih dari 0'
            });
        }

        // Validasi harga
        if (
            price_per_unit !== undefined &&
            price_per_unit !== null &&
            Number(price_per_unit) < 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Harga per unit tidak boleh negatif'
            });
        }

        // Pastikan crop cycle milik user
        const [cropCycles] = await pool.execute(
            `SELECT cc.id
             FROM crop_cycles cc
             INNER JOIN fields f
                ON f.id = cc.field_id
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE cc.id = ?
             AND farms.user_id = ?`,
            [crop_cycle_id, userId]
        );

        if (cropCycles.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Siklus tanaman tidak ditemukan atau bukan milik Anda'
            });
        }

        // Simpan panen
        const [result] = await pool.execute(
            `INSERT INTO harvests
            (
                crop_cycle_id,
                harvest_date,
                quantity,
                unit,
                grade,
                price_per_unit,
                notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                crop_cycle_id,
                harvest_date,
                quantity,
                unit.trim(),
                grade || null,
                price_per_unit ?? 0,
                notes || null
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Data panen berhasil ditambahkan',
            data: {
                id: result.insertId,
                crop_cycle_id,
                harvest_date,
                quantity,
                unit: unit.trim(),
                grade: grade || null,
                price_per_unit: price_per_unit ?? 0,
                total_income: Number(quantity) * Number(price_per_unit ?? 0),
                notes: notes || null
            }
        });

    } catch (error) {
        console.error('Create harvest error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


// ==============================
// UPDATE HARVEST
// ==============================
const updateHarvest = async (req, res) => {
    try {
        const userId = req.user.userId;
        const harvestId = req.params.id;

        const {
            crop_cycle_id,
            harvest_date,
            quantity,
            unit,
            grade,
            price_per_unit,
            notes
        } = req.body;

        if (
            !crop_cycle_id ||
            !harvest_date ||
            quantity === undefined ||
            quantity === null ||
            !unit
        ) {
            return res.status(400).json({
                success: false,
                message: 'crop_cycle_id, tanggal panen, jumlah, dan satuan wajib diisi'
            });
        }

        if (Number(quantity) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Jumlah panen harus lebih dari 0'
            });
        }

        if (
            price_per_unit !== undefined &&
            price_per_unit !== null &&
            Number(price_per_unit) < 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Harga per unit tidak boleh negatif'
            });
        }

        // Pastikan crop cycle milik user
        const [cropCycles] = await pool.execute(
            `SELECT cc.id
             FROM crop_cycles cc
             INNER JOIN fields f
                ON f.id = cc.field_id
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE cc.id = ?
             AND farms.user_id = ?`,
            [crop_cycle_id, userId]
        );

        if (cropCycles.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Siklus tanaman tidak ditemukan atau bukan milik Anda'
            });
        }

        // Pastikan harvest milik user
        const [existingHarvest] = await pool.execute(
            `SELECT h.id
             FROM harvests h
             INNER JOIN crop_cycles cc
                ON cc.id = h.crop_cycle_id
             INNER JOIN fields f
                ON f.id = cc.field_id
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE h.id = ?
             AND farms.user_id = ?`,
            [harvestId, userId]
        );

        if (existingHarvest.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Data panen tidak ditemukan'
            });
        }

        await pool.execute(
            `UPDATE harvests
             SET
                crop_cycle_id = ?,
                harvest_date = ?,
                quantity = ?,
                unit = ?,
                grade = ?,
                price_per_unit = ?,
                notes = ?
             WHERE id = ?`,
            [
                crop_cycle_id,
                harvest_date,
                quantity,
                unit.trim(),
                grade || null,
                price_per_unit ?? 0,
                notes || null,
                harvestId
            ]
        );

        return res.status(200).json({
            success: true,
            message: 'Data panen berhasil diperbarui'
        });

    } catch (error) {
        console.error('Update harvest error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


// ==============================
// DELETE HARVEST
// ==============================
const deleteHarvest = async (req, res) => {
    try {
        const userId = req.user.userId;
        const harvestId = req.params.id;

        const [existingHarvest] = await pool.execute(
            `SELECT h.id
             FROM harvests h
             INNER JOIN crop_cycles cc
                ON cc.id = h.crop_cycle_id
             INNER JOIN fields f
                ON f.id = cc.field_id
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE h.id = ?
             AND farms.user_id = ?`,
            [harvestId, userId]
        );

        if (existingHarvest.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Data panen tidak ditemukan'
            });
        }

        await pool.execute(
            `DELETE FROM harvests
             WHERE id = ?`,
            [harvestId]
        );

        return res.status(200).json({
            success: true,
            message: 'Data panen berhasil dihapus'
        });

    } catch (error) {
        console.error('Delete harvest error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


module.exports = {
    getHarvests,
    getHarvestById,
    createHarvest,
    updateHarvest,
    deleteHarvest
};