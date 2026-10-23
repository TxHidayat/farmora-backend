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
             INNER JOIN crop_cycles cc ON cc.id = a.crop_cycle_id
             INNER JOIN fields f ON f.id = cc.field_id
             INNER JOIN farms ON farms.id = f.farm_id
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
             INNER JOIN crop_cycles cc ON cc.id = a.crop_cycle_id
             INNER JOIN fields f ON f.id = cc.field_id
             INNER JOIN farms ON farms.id = f.farm_id
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

        // Debug sementara untuk melacak request POST.
        console.log('CREATE ACTIVITY HIT');
        console.log('User ID:', userId);
        console.log('Request body keys:', Object.keys(req.body || {}));

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

        // Validasi field wajib
        if (!crop_cycle_id || !activity_type || !activity_date) {
            return res.status(400).json({
                success: false,
                message: 'crop_cycle_id, activity_type, dan activity_date wajib diisi'
            });
        }

        if (typeof activity_type !== 'string' || !activity_type.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Jenis aktivitas harus berupa teks yang valid'
            });
        }

        // Validasi format tanggal
        if (
            typeof activity_date !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(activity_date) ||
            Number.isNaN(Date.parse(`${activity_date}T00:00:00Z`))
        ) {
            return res.status(400).json({
                success: false,
                message: 'Tanggal aktivitas harus menggunakan format YYYY-MM-DD'
            });
        }

        // Validasi jumlah
        if (quantity !== undefined && quantity !== null && quantity !== '') {
            const quantityValue = Number(quantity);

            if (!Number.isFinite(quantityValue) || quantityValue < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Jumlah harus berupa angka valid dan tidak boleh negatif'
                });
            }
        }

        // Validasi biaya
        if (cost !== undefined && cost !== null && cost !== '') {
            const costValue = Number(cost);

            if (!Number.isFinite(costValue) || costValue < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Biaya harus berupa angka valid dan tidak boleh negatif'
                });
            }
        }

        // Pastikan crop cycle milik user yang login
        const [cropCycles] = await pool.execute(
            `SELECT cc.id
             FROM crop_cycles cc
             INNER JOIN fields f ON f.id = cc.field_id
             INNER JOIN farms ON farms.id = f.farm_id
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

        // Simpan aktivitas
        const [result] = await pool.execute(
            `INSERT INTO activities (
                crop_cycle_id,
                activity_type,
                activity_date,
                description,
                quantity,
                unit,
                cost,
                notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                crop_cycle_id,
                activity_type.trim(),
                activity_date,
                description || null,
                quantity === '' || quantity === undefined ? null : quantity,
                unit || null,
                cost === '' || cost === undefined || cost === null ? 0 : cost,
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
                quantity: quantity === '' || quantity === undefined ? null : quantity,
                unit: unit || null,
                cost: cost === '' || cost === undefined || cost === null ? 0 : cost,
                notes: notes || null
            }
        });
    } catch (error) {
        // Detail error hanya ditampilkan di terminal backend
        console.error('=== CREATE ACTIVITY ERROR ===');
        console.error('Error name:', error.name);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('SQL state:', error.sqlState);
        console.error('SQL message:', error.sqlMessage);
        console.error('Error stack:', error.stack);

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

        if (!crop_cycle_id || !activity_type || !activity_date) {
            return res.status(400).json({
                success: false,
                message: 'crop_cycle_id, activity_type, dan activity_date wajib diisi'
            });
        }

        if (typeof activity_type !== 'string' || !activity_type.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Jenis aktivitas harus berupa teks yang valid'
            });
        }

        if (
            typeof activity_date !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(activity_date) ||
            Number.isNaN(Date.parse(`${activity_date}T00:00:00Z`))
        ) {
            return res.status(400).json({
                success: false,
                message: 'Tanggal aktivitas harus menggunakan format YYYY-MM-DD'
            });
        }

        if (quantity !== undefined && quantity !== null && quantity !== '') {
            const quantityValue = Number(quantity);

            if (!Number.isFinite(quantityValue) || quantityValue < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Jumlah harus berupa angka valid dan tidak boleh negatif'
                });
            }
        }

        if (cost !== undefined && cost !== null && cost !== '') {
            const costValue = Number(cost);

            if (!Number.isFinite(costValue) || costValue < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Biaya harus berupa angka valid dan tidak boleh negatif'
                });
            }
        }

        // Pastikan crop cycle tujuan milik user
        const [cropCycles] = await pool.execute(
            `SELECT cc.id
             FROM crop_cycles cc
             INNER JOIN fields f ON f.id = cc.field_id
             INNER JOIN farms ON farms.id = f.farm_id
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

        // Pastikan aktivitas yang akan diubah milik user
        const [existingActivity] = await pool.execute(
            `SELECT a.id
             FROM activities a
             INNER JOIN crop_cycles cc ON cc.id = a.crop_cycle_id
             INNER JOIN fields f ON f.id = cc.field_id
             INNER JOIN farms ON farms.id = f.farm_id
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
             SET crop_cycle_id = ?,
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
                quantity === '' || quantity === undefined ? null : quantity,
                unit || null,
                cost === '' || cost === undefined || cost === null ? 0 : cost,
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
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);

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

        // Pastikan aktivitas milik user
        const [existingActivity] = await pool.execute(
            `SELECT a.id
             FROM activities a
             INNER JOIN crop_cycles cc ON cc.id = a.crop_cycle_id
             INNER JOIN fields f ON f.id = cc.field_id
             INNER JOIN farms ON farms.id = f.farm_id
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
            `DELETE FROM activities WHERE id = ?`,
            [activityId]
        );

        return res.status(200).json({
            success: true,
            message: 'Aktivitas berhasil dihapus'
        });
    } catch (error) {
        console.error('Delete activity error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);

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