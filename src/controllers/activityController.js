const pool = require('../config/database');

// ==============================
// GET ALL ACTIVITIES
// ==============================
const getActivities = async (req, res) => {
    try {
        const userId = req.user.userId;

        const [activities] = await pool.execute(
            `SELECT
                a.id,
                a.crop_cycle_id,
                a.activity_type,
                DATE_FORMAT(a.activity_date, '%Y-%m-%d') AS activity_date,
                a.description,
                a.quantity,
                a.unit,
                a.cost,
                a.notes,
                a.created_at,
                a.updated_at,
                cc.crop_name,
                cc.variety,
                f.id AS field_id,
                f.name AS field_name,
                farms.id AS farm_id,
                farms.name AS farm_name
             FROM activities a
             INNER JOIN crop_cycles cc
                ON cc.id = a.crop_cycle_id
             INNER JOIN fields f
                ON f.id = cc.field_id
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE farms.user_id = ?
             ORDER BY a.activity_date DESC, a.created_at DESC`,
            [userId]
        );

        return res.status(200).json({
            success: true,
            data: activities
        });

    } catch (error) {
        console.error('Get activities error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


// ==============================
// GET ACTIVITY BY ID
// ==============================
const getActivityById = async (req, res) => {
    try {
        const userId = req.user.userId;
        const activityId = req.params.id;

        const [activities] = await pool.execute(
            `SELECT
                a.id,
                a.crop_cycle_id,
                a.activity_type,
                DATE_FORMAT(a.activity_date, '%Y-%m-%d') AS activity_date,
                a.description,
                a.quantity,
                a.unit,
                a.cost,
                a.notes,
                a.created_at,
                a.updated_at,
                cc.crop_name,
                cc.variety,
                f.id AS field_id,
                f.name AS field_name,
                farms.id AS farm_id,
                farms.name AS farm_name
             FROM activities a
             INNER JOIN crop_cycles cc
                ON cc.id = a.crop_cycle_id
             INNER JOIN fields f
                ON f.id = cc.field_id
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE a.id = ?
             AND farms.user_id = ?`,
            [activityId, userId]
        );

        if (activities.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Aktivitas tidak ditemukan'
            });
        }

        return res.status(200).json({
            success: true,
            data: activities[0]
        });

    } catch (error) {
        console.error('Get activity error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


// ==============================
// CREATE ACTIVITY
// ==============================
const createActivity = async (req, res) => {
    try {
        const userId = req.user.userId;

        const {
            crop_cycle_id,
            activity_type,
            activity_date,
            description,
            quantity,
            unit,
            cost,
            notes
        } = req.body;

        // Validasi input wajib
        if (!crop_cycle_id || !activity_type || !activity_date) {
            return res.status(400).json({
                success: false,
                message: 'crop_cycle_id, jenis aktivitas, dan tanggal wajib diisi'
            });
        }

        // Validasi quantity
        if (
            quantity !== undefined &&
            quantity !== null &&
            Number(quantity) < 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Jumlah tidak boleh negatif'
            });
        }

        // Validasi cost
        if (
            cost !== undefined &&
            cost !== null &&
            Number(cost) < 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Biaya tidak boleh negatif'
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

        // Insert activity
        const [result] = await pool.execute(
            `INSERT INTO activities
            (
                crop_cycle_id,
                activity_type,
                activity_date,
                description,
                quantity,
                unit,
                cost,
                notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                crop_cycle_id,
                activity_type.trim(),
                activity_date,
                description || null,
                quantity ?? null,
                unit || null,
                cost ?? 0,
                notes || null
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Aktivitas berhasil ditambahkan',
            data: {
                id: result.insertId,
                crop_cycle_id,
                activity_type: activity_type.trim(),
                activity_date,
                description: description || null,
                quantity: quantity ?? null,
                unit: unit || null,
                cost: cost ?? 0,
                notes: notes || null
            }
        });

    } catch (error) {
        console.error('Create activity error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


// ==============================
// UPDATE ACTIVITY
// ==============================
const updateActivity = async (req, res) => {
    try {
        const userId = req.user.userId;
        const activityId = req.params.id;

        const {
            crop_cycle_id,
            activity_type,
            activity_date,
            description,
            quantity,
            unit,
            cost,
            notes
        } = req.body;

        // Validasi
        if (!crop_cycle_id || !activity_type || !activity_date) {
            return res.status(400).json({
                success: false,
                message: 'crop_cycle_id, jenis aktivitas, dan tanggal wajib diisi'
            });
        }

        if (
            quantity !== undefined &&
            quantity !== null &&
            Number(quantity) < 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Jumlah tidak boleh negatif'
            });
        }

        if (
            cost !== undefined &&
            cost !== null &&
            Number(cost) < 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Biaya tidak boleh negatif'
            });
        }

        // Pastikan crop cycle baru milik user
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

        // Pastikan activity lama milik user
        const [existingActivity] = await pool.execute(
            `SELECT a.id
             FROM activities a
             INNER JOIN crop_cycles cc
                ON cc.id = a.crop_cycle_id
             INNER JOIN fields f
                ON f.id = cc.field_id
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE a.id = ?
             AND farms.user_id = ?`,
            [activityId, userId]
        );

        if (existingActivity.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Aktivitas tidak ditemukan'
            });
        }

        await pool.execute(
            `UPDATE activities
             SET
                crop_cycle_id = ?,
                activity_type = ?,
                activity_date = ?,
                description = ?,
                quantity = ?,
                unit = ?,
                cost = ?,
                notes = ?
             WHERE id = ?`,
            [
                crop_cycle_id,
                activity_type.trim(),
                activity_date,
                description || null,
                quantity ?? null,
                unit || null,
                cost ?? 0,
                notes || null,
                activityId
            ]
        );

        return res.status(200).json({
            success: true,
            message: 'Aktivitas berhasil diperbarui'
        });

    } catch (error) {
        console.error('Update activity error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


// ==============================
// DELETE ACTIVITY
// ==============================
const deleteActivity = async (req, res) => {
    try {
        const userId = req.user.userId;
        const activityId = req.params.id;

        // Pastikan activity milik user
        const [existingActivity] = await pool.execute(
            `SELECT a.id
             FROM activities a
             INNER JOIN crop_cycles cc
                ON cc.id = a.crop_cycle_id
             INNER JOIN fields f
                ON f.id = cc.field_id
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE a.id = ?
             AND farms.user_id = ?`,
            [activityId, userId]
        );

        if (existingActivity.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Aktivitas tidak ditemukan'
            });
        }

        await pool.execute(
            `DELETE FROM activities
             WHERE id = ?`,
            [activityId]
        );

        return res.status(200).json({
            success: true,
            message: 'Aktivitas berhasil dihapus'
        });

    } catch (error) {
        console.error('Delete activity error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


module.exports = {
    getActivities,
    getActivityById,
    createActivity,
    updateActivity,
    deleteActivity
};