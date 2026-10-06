const pool = require('../config/database');


// ==============================
// GET ALL FIELDS
// ==============================

const getFields = async (req, res) => {
    try {
        const userId = req.user.userId;

        const [fields] = await pool.execute(
            `SELECT
                f.id,
                f.farm_id,
                f.name,
                f.area,
                f.area_unit,
                f.soil_type,
                f.location,
                f.notes,
                f.notes AS description,
                f.created_at,
                f.updated_at,
                farms.name AS farm_name
             FROM fields f
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE farms.user_id = ?
             ORDER BY f.created_at DESC`,
            [userId]
        );

        return res.status(200).json({
            success: true,
            data: fields
        });

    } catch (error) {
        console.error(
            'Get fields error:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


// ==============================
// GET FIELD BY ID
// ==============================

const getFieldById = async (req, res) => {
    try {
        const userId = req.user.userId;
        const fieldId = req.params.id;

        const [fields] = await pool.execute(
            `SELECT
                f.id,
                f.farm_id,
                f.name,
                f.area,
                f.area_unit,
                f.soil_type,
                f.location,
                f.notes,
                f.notes AS description,
                f.created_at,
                f.updated_at,
                farms.name AS farm_name
             FROM fields f
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE f.id = ?
             AND farms.user_id = ?`,
            [fieldId, userId]
        );

        if (fields.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lahan tidak ditemukan'
            });
        }

        return res.status(200).json({
            success: true,
            data: fields[0]
        });

    } catch (error) {
        console.error(
            'Get field error:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


// ==============================
// CREATE FIELD
// ==============================

const createField = async (req, res) => {
    try {
        const userId = req.user.userId;

        const {
            farm_id,
            name,
            area,
            area_unit,
            soil_type,
            location,
            notes,
            description
        } = req.body;


        // ==============================
        // VALIDASI INPUT
        // ==============================

        if (
            farm_id === undefined ||
            farm_id === null ||
            farm_id === '' ||
            !name ||
            area === undefined ||
            area === null ||
            area === ''
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'farm_id, nama lahan, dan luas wajib diisi'
            });
        }


        const farmId = Number(farm_id);
        const areaValue = Number(area);


        if (
            !Number.isInteger(farmId) ||
            farmId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'farm_id tidak valid'
            });
        }


        if (
            Number.isNaN(areaValue) ||
            !Number.isFinite(areaValue) ||
            areaValue <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Luas lahan harus berupa angka lebih dari 0'
            });
        }


        // ==============================
        // VALIDASI UNIT
        // ==============================

        const areaUnit =
            area_unit === 'ha'
                ? 'ha'
                : 'm2';


        // ==============================
        // PASTIKAN FARM MILIK USER
        // ==============================

        const [farms] = await pool.execute(
            `SELECT id
             FROM farms
             WHERE id = ?
             AND user_id = ?`,
            [farmId, userId]
        );


        if (farms.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    'Kebun tidak ditemukan atau bukan milik Anda'
            });
        }


        // ==============================
        // DESCRIPTION / NOTES
        // ==============================

        const notesValue =
            description !== undefined
                ? description
                : notes;


        // ==============================
        // INSERT FIELD
        // ==============================

        const [result] = await pool.execute(
            `INSERT INTO fields
            (
                farm_id,
                name,
                area,
                area_unit,
                soil_type,
                location,
                notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                farmId,
                name.trim(),
                areaValue,
                areaUnit,
                soil_type?.trim() || null,
                location?.trim() || null,
                notesValue?.trim() || null
            ]
        );


        return res.status(201).json({
            success: true,
            message: 'Lahan berhasil ditambahkan',
            data: {
                id: result.insertId,
                farm_id: farmId,
                name: name.trim(),
                area: areaValue,
                area_unit: areaUnit,
                soil_type:
                    soil_type?.trim() || null,
                location:
                    location?.trim() || null,
                notes:
                    notesValue?.trim() || null,
                description:
                    notesValue?.trim() || null
            }
        });

    } catch (error) {
        console.error(
            'Create field error:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


// ==============================
// UPDATE FIELD
// ==============================

const updateField = async (req, res) => {
    try {
        const userId = req.user.userId;
        const fieldId = req.params.id;

        const {
            farm_id,
            name,
            area,
            area_unit,
            soil_type,
            location,
            notes,
            description
        } = req.body;


        // ==============================
        // VALIDASI INPUT
        // ==============================

        if (
            farm_id === undefined ||
            farm_id === null ||
            farm_id === '' ||
            !name ||
            area === undefined ||
            area === null ||
            area === ''
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'farm_id, nama lahan, dan luas wajib diisi'
            });
        }


        const farmId = Number(farm_id);
        const areaValue = Number(area);


        if (
            !Number.isInteger(farmId) ||
            farmId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'farm_id tidak valid'
            });
        }


        if (
            Number.isNaN(areaValue) ||
            !Number.isFinite(areaValue) ||
            areaValue <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Luas lahan harus berupa angka lebih dari 0'
            });
        }


        // ==============================
        // VALIDASI UNIT
        // ==============================

        const areaUnit =
            area_unit === 'ha'
                ? 'ha'
                : 'm2';


        // ==============================
        // PASTIKAN FARM MILIK USER
        // ==============================

        const [farms] = await pool.execute(
            `SELECT id
             FROM farms
             WHERE id = ?
             AND user_id = ?`,
            [farmId, userId]
        );


        if (farms.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    'Kebun tidak ditemukan atau bukan milik Anda'
            });
        }


        // ==============================
        // PASTIKAN FIELD MILIK USER
        // ==============================

        const [existingFields] = await pool.execute(
            `SELECT fields.id
             FROM fields
             INNER JOIN farms
                ON farms.id = fields.farm_id
             WHERE fields.id = ?
             AND farms.user_id = ?`,
            [fieldId, userId]
        );


        if (existingFields.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lahan tidak ditemukan'
            });
        }


        // ==============================
        // DESCRIPTION / NOTES
        // ==============================

        const notesValue =
            description !== undefined
                ? description
                : notes;


        // ==============================
        // UPDATE
        // ==============================

        await pool.execute(
            `UPDATE fields
             SET
                farm_id = ?,
                name = ?,
                area = ?,
                area_unit = ?,
                soil_type = ?,
                location = ?,
                notes = ?
             WHERE id = ?`,
            [
                farmId,
                name.trim(),
                areaValue,
                areaUnit,
                soil_type?.trim() || null,
                location?.trim() || null,
                notesValue?.trim() || null,
                fieldId
            ]
        );


        return res.status(200).json({
            success: true,
            message: 'Lahan berhasil diperbarui'
        });

    } catch (error) {
        console.error(
            'Update field error:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


// ==============================
// DELETE FIELD
// ==============================

const deleteField = async (req, res) => {
    try {
        const userId = req.user.userId;
        const fieldId = req.params.id;


        // ==============================
        // PASTIKAN FIELD MILIK USER
        // ==============================

        const [existingFields] = await pool.execute(
            `SELECT fields.id
             FROM fields
             INNER JOIN farms
                ON farms.id = fields.farm_id
             WHERE fields.id = ?
             AND farms.user_id = ?`,
            [fieldId, userId]
        );


        if (existingFields.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lahan tidak ditemukan'
            });
        }


        // ==============================
        // DELETE
        // ==============================

        await pool.execute(
            `DELETE FROM fields
             WHERE id = ?`,
            [fieldId]
        );


        return res.status(200).json({
            success: true,
            message: 'Lahan berhasil dihapus'
        });

    } catch (error) {
        console.error(
            'Delete field error:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


module.exports = {
    getFields,
    getFieldById,
    createField,
    updateField,
    deleteField
};