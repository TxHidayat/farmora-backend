const pool = require('../config/database');

// ==============================
// GET ALL FARMS
// ==============================

const getFarms = async (req, res) => {
    try {
        const userId = req.user.userId;

        const [farms] = await pool.execute(
            `SELECT
                id,
                name,
                location,
                latitude,
                longitude,
                description,
                created_at,
                updated_at
             FROM farms
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [userId]
        );

        return res.status(200).json({
            success: true,
            data: farms
        });

    } catch (error) {
        console.error('Get farms error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


// ==============================
// GET FARM BY ID
// ==============================

const getFarmById = async (req, res) => {
    try {
        const userId = req.user.userId;
        const farmId = req.params.id;

        const [farms] = await pool.execute(
            `SELECT
                id,
                name,
                location,
                latitude,
                longitude,
                description,
                created_at,
                updated_at
             FROM farms
             WHERE id = ?
             AND user_id = ?`,
            [farmId, userId]
        );

        if (farms.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kebun tidak ditemukan'
            });
        }

        return res.status(200).json({
            success: true,
            data: farms[0]
        });

    } catch (error) {
        console.error('Get farm error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


// ==============================
// CREATE FARM
// ==============================

const createFarm = async (req, res) => {
    try {
        const userId = req.user.userId;

        const {
            name,
            location,
            latitude,
            longitude,
            description
        } = req.body;

        // ==============================
        // VALIDASI NAMA
        // ==============================

        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Nama kebun wajib diisi'
            });
        }


        // ==============================
        // KONVERSI KOORDINAT
        // ==============================

        const latitudeValue =
            latitude !== undefined &&
                latitude !== ''
                ? Number(latitude)
                : null;

        const longitudeValue =
            longitude !== undefined &&
                longitude !== ''
                ? Number(longitude)
                : null;


        // ==============================
        // VALIDASI LATITUDE
        // ==============================

        if (
            latitudeValue !== null &&
            (
                Number.isNaN(latitudeValue) ||
                latitudeValue < -90 ||
                latitudeValue > 90
            )
        ) {
            return res.status(400).json({
                success: false,
                message: 'Latitude harus berada antara -90 dan 90'
            });
        }


        // ==============================
        // VALIDASI LONGITUDE
        // ==============================

        if (
            longitudeValue !== null &&
            (
                Number.isNaN(longitudeValue) ||
                longitudeValue < -180 ||
                longitudeValue > 180
            )
        ) {
            return res.status(400).json({
                success: false,
                message: 'Longitude harus berada antara -180 dan 180'
            });
        }


        // ==============================
        // INSERT FARM
        // ==============================

        const [result] = await pool.execute(
            `INSERT INTO farms
            (
                user_id,
                name,
                location,
                latitude,
                longitude,
                description
            )
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                userId,
                name.trim(),
                location || null,
                latitudeValue,
                longitudeValue,
                description || null
            ]
        );


        // ==============================
        // RESPONSE
        // ==============================

        return res.status(201).json({
            success: true,
            message: 'Kebun berhasil ditambahkan',
            data: {
                id: result.insertId,
                name: name.trim(),
                location: location || null,
                latitude: latitudeValue,
                longitude: longitudeValue,
                description: description || null
            }
        });

    } catch (error) {
        console.error('Create farm error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


// ==============================
// UPDATE FARM
// ==============================

const updateFarm = async (req, res) => {
    try {
        const userId = req.user.userId;
        const farmId = req.params.id;

        const {
            name,
            location,
            latitude,
            longitude,
            description
        } = req.body;


        // ==============================
        // VALIDASI NAMA
        // ==============================

        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Nama kebun wajib diisi'
            });
        }


        // ==============================
        // KONVERSI KOORDINAT
        // ==============================

        const latitudeValue =
            latitude !== undefined &&
                latitude !== ''
                ? Number(latitude)
                : null;

        const longitudeValue =
            longitude !== undefined &&
                longitude !== ''
                ? Number(longitude)
                : null;


        // ==============================
        // VALIDASI LATITUDE
        // ==============================

        if (
            latitudeValue !== null &&
            (
                Number.isNaN(latitudeValue) ||
                latitudeValue < -90 ||
                latitudeValue > 90
            )
        ) {
            return res.status(400).json({
                success: false,
                message: 'Latitude harus berada antara -90 dan 90'
            });
        }


        // ==============================
        // VALIDASI LONGITUDE
        // ==============================

        if (
            longitudeValue !== null &&
            (
                Number.isNaN(longitudeValue) ||
                longitudeValue < -180 ||
                longitudeValue > 180
            )
        ) {
            return res.status(400).json({
                success: false,
                message: 'Longitude harus berada antara -180 dan 180'
            });
        }


        // ==============================
        // CEK OWNERSHIP FARM
        // ==============================

        const [existingFarm] = await pool.execute(
            `SELECT id
             FROM farms
             WHERE id = ?
             AND user_id = ?`,
            [farmId, userId]
        );

        if (existingFarm.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kebun tidak ditemukan'
            });
        }


        // ==============================
        // UPDATE FARM
        // ==============================

        await pool.execute(
            `UPDATE farms
             SET
                name = ?,
                location = ?,
                latitude = ?,
                longitude = ?,
                description = ?
             WHERE id = ?
             AND user_id = ?`,
            [
                name.trim(),
                location || null,
                latitudeValue,
                longitudeValue,
                description || null,
                farmId,
                userId
            ]
        );


        // ==============================
        // RESPONSE
        // ==============================

        return res.status(200).json({
            success: true,
            message: 'Kebun berhasil diperbarui'
        });

    } catch (error) {
        console.error('Update farm error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


// ==============================
// DELETE FARM
// ==============================

const deleteFarm = async (req, res) => {
    try {
        const userId = req.user.userId;
        const farmId = req.params.id;


        // ==============================
        // CEK OWNERSHIP FARM
        // ==============================

        const [existingFarm] = await pool.execute(
            `SELECT id
             FROM farms
             WHERE id = ?
             AND user_id = ?`,
            [farmId, userId]
        );

        if (existingFarm.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kebun tidak ditemukan'
            });
        }


        // ==============================
        // DELETE FARM
        // ==============================

        await pool.execute(
            `DELETE FROM farms
             WHERE id = ?
             AND user_id = ?`,
            [farmId, userId]
        );


        // ==============================
        // RESPONSE
        // ==============================

        return res.status(200).json({
            success: true,
            message: 'Kebun berhasil dihapus'
        });

    } catch (error) {
        console.error('Delete farm error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


// ==============================
// EXPORT
// ==============================

module.exports = {
    getFarms,
    getFarmById,
    createFarm,
    updateFarm,
    deleteFarm
};