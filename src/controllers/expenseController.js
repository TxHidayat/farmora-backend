const pool = require('../config/database');


// =========================================
// GET ALL EXPENSES
// =========================================

const getExpenses = async (req, res) => {
    try {
        const userId = req.user.userId;

        const [expenses] = await pool.execute(
            `
            SELECT
                e.id,
                e.farm_id,
                e.crop_cycle_id,
                DATE_FORMAT(
                    e.expense_date,
                    '%Y-%m-%d'
                ) AS expense_date,
                e.category,
                e.amount,
                e.description,
                e.notes,
                e.created_at,
                e.updated_at,

                f.name AS farm_name,

                cc.crop_name

            FROM expenses e

            INNER JOIN farms f
                ON f.id = e.farm_id

            LEFT JOIN crop_cycles cc
                ON cc.id = e.crop_cycle_id

            WHERE f.user_id = ?

            ORDER BY
                e.expense_date DESC,
                e.created_at DESC
            `,
            [userId]
        );

        return res.status(200).json({
            success: true,
            data: expenses
        });

    } catch (error) {

        console.error(
            'Get expenses error:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Gagal mengambil data pengeluaran.'
        });
    }
};


// =========================================
// GET EXPENSE BY ID
// =========================================

const getExpenseById = async (req, res) => {
    try {

        const userId = req.user.userId;
        const expenseId = req.params.id;

        const [expenses] = await pool.execute(
            `
            SELECT
                e.id,
                e.farm_id,
                e.crop_cycle_id,

                DATE_FORMAT(
                    e.expense_date,
                    '%Y-%m-%d'
                ) AS expense_date,

                e.category,
                e.amount,
                e.description,
                e.notes,
                e.created_at,
                e.updated_at,

                f.name AS farm_name,
                cc.crop_name

            FROM expenses e

            INNER JOIN farms f
                ON f.id = e.farm_id

            LEFT JOIN crop_cycles cc
                ON cc.id = e.crop_cycle_id

            WHERE e.id = ?
            AND f.user_id = ?
            `,
            [
                expenseId,
                userId
            ]
        );

        if (expenses.length === 0) {

            return res.status(404).json({
                success: false,
                message:
                    'Pengeluaran tidak ditemukan.'
            });
        }

        return res.status(200).json({
            success: true,
            data: expenses[0]
        });

    } catch (error) {

        console.error(
            'Get expense error:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Gagal mengambil data pengeluaran.'
        });
    }
};


// =========================================
// CREATE EXPENSE
// =========================================

const createExpense = async (req, res) => {
    try {

        const userId = req.user.userId;

        const {
            farm_id,
            crop_cycle_id,
            expense_date,
            category,
            amount,
            description,
            notes
        } = req.body;


        // =====================================
        // VALIDATION
        // =====================================

        if (
            !farm_id ||
            !expense_date ||
            !category ||
            amount === undefined ||
            amount === null
        ) {

            return res.status(400).json({
                success: false,
                message:
                    'farm_id, tanggal, kategori, dan jumlah wajib diisi.'
            });
        }


        if (Number(amount) <= 0) {

            return res.status(400).json({
                success: false,
                message:
                    'Jumlah pengeluaran harus lebih dari 0.'
            });
        }


        const allowedCategories = [
            'bibit',
            'pupuk',
            'pestisida',
            'tenaga_kerja'
        ];


        if (
            !allowedCategories.includes(
                category
            )
        ) {

            return res.status(400).json({
                success: false,
                message:
                    'Kategori pengeluaran tidak valid.'
            });
        }


        // =====================================
        // CHECK FARM OWNERSHIP
        // =====================================

        const [farms] = await pool.execute(
            `
            SELECT id
            FROM farms
            WHERE id = ?
            AND user_id = ?
            `,
            [
                farm_id,
                userId
            ]
        );


        if (farms.length === 0) {

            return res.status(404).json({
                success: false,
                message:
                    'Kebun tidak ditemukan atau bukan milik Anda.'
            });
        }


        // =====================================
        // CHECK CROP CYCLE
        // =====================================

        let cropCycleId = null;


        if (
            crop_cycle_id !== undefined &&
            crop_cycle_id !== null &&
            crop_cycle_id !== ''
        ) {

            const [cropCycles] =
                await pool.execute(
                    `
                    SELECT
                        cc.id
                    FROM crop_cycles cc

                    INNER JOIN fields f
                        ON f.id = cc.field_id

                    INNER JOIN farms fm
                        ON fm.id = f.farm_id

                    WHERE cc.id = ?
                    AND fm.id = ?
                    AND fm.user_id = ?
                    `,
                    [
                        crop_cycle_id,
                        farm_id,
                        userId
                    ]
                );


            if (cropCycles.length === 0) {

                return res.status(404).json({
                    success: false,
                    message:
                        'Tanaman tidak ditemukan pada kebun tersebut.'
                });
            }


            cropCycleId =
                Number(crop_cycle_id);
        }


        // =====================================
        // INSERT
        // =====================================

        const [result] =
            await pool.execute(
                `
                INSERT INTO expenses
                (
                    farm_id,
                    crop_cycle_id,
                    expense_date,
                    category,
                    amount,
                    description,
                    notes
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    Number(farm_id),

                    cropCycleId,

                    expense_date,

                    category,

                    Number(amount),

                    description?.trim() || null,

                    notes?.trim() || null
                ]
            );


        return res.status(201).json({

            success: true,

            message:
                'Pengeluaran berhasil ditambahkan.',

            data: {
                id: result.insertId,

                farm_id:
                    Number(farm_id),

                crop_cycle_id:
                    cropCycleId,

                expense_date,

                category,

                amount:
                    Number(amount),

                description:
                    description?.trim() || null,

                notes:
                    notes?.trim() || null
            }

        });

    } catch (error) {

        console.error(
            'Create expense error:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Gagal menambahkan pengeluaran.'
        });
    }
};


// =========================================
// UPDATE EXPENSE
// =========================================

const updateExpense = async (req, res) => {
    try {

        const userId = req.user.userId;
        const expenseId = req.params.id;

        const {
            farm_id,
            crop_cycle_id,
            expense_date,
            category,
            amount,
            description,
            notes
        } = req.body;


        // =====================================
        // VALIDATION
        // =====================================

        if (
            !farm_id ||
            !expense_date ||
            !category ||
            amount === undefined ||
            amount === null
        ) {

            return res.status(400).json({
                success: false,
                message:
                    'farm_id, tanggal, kategori, dan jumlah wajib diisi.'
            });
        }


        if (Number(amount) <= 0) {

            return res.status(400).json({
                success: false,
                message:
                    'Jumlah pengeluaran harus lebih dari 0.'
            });
        }


        const allowedCategories = [
            'bibit',
            'pupuk',
            'pestisida',
            'tenaga_kerja'
        ];


        if (
            !allowedCategories.includes(
                category
            )
        ) {

            return res.status(400).json({
                success: false,
                message:
                    'Kategori pengeluaran tidak valid.'
            });
        }


        // =====================================
        // CHECK FARM
        // =====================================

        const [farms] = await pool.execute(
            `
            SELECT id
            FROM farms
            WHERE id = ?
            AND user_id = ?
            `,
            [
                farm_id,
                userId
            ]
        );


        if (farms.length === 0) {

            return res.status(404).json({
                success: false,
                message:
                    'Kebun tidak ditemukan atau bukan milik Anda.'
            });
        }


        // =====================================
        // CHECK EXISTING EXPENSE
        // =====================================

        const [existingExpenses] =
            await pool.execute(
                `
                SELECT e.id
                FROM expenses e

                INNER JOIN farms f
                    ON f.id = e.farm_id

                WHERE e.id = ?
                AND f.user_id = ?
                `,
                [
                    expenseId,
                    userId
                ]
            );


        if (existingExpenses.length === 0) {

            return res.status(404).json({
                success: false,
                message:
                    'Pengeluaran tidak ditemukan.'
            });
        }


        // =====================================
        // CROP CYCLE
        // =====================================

        let cropCycleId = null;


        if (
            crop_cycle_id !== undefined &&
            crop_cycle_id !== null &&
            crop_cycle_id !== ''
        ) {

            const [cropCycles] =
                await pool.execute(
                    `
                    SELECT cc.id
                    FROM crop_cycles cc

                    INNER JOIN fields f
                        ON f.id = cc.field_id

                    INNER JOIN farms fm
                        ON fm.id = f.farm_id

                    WHERE cc.id = ?
                    AND fm.id = ?
                    AND fm.user_id = ?
                    `,
                    [
                        crop_cycle_id,
                        farm_id,
                        userId
                    ]
                );


            if (cropCycles.length === 0) {

                return res.status(404).json({
                    success: false,
                    message:
                        'Tanaman tidak ditemukan pada kebun tersebut.'
                });
            }


            cropCycleId =
                Number(crop_cycle_id);
        }


        // =====================================
        // UPDATE
        // =====================================

        await pool.execute(
            `
            UPDATE expenses

            SET
                farm_id = ?,
                crop_cycle_id = ?,
                expense_date = ?,
                category = ?,
                amount = ?,
                description = ?,
                notes = ?

            WHERE id = ?
            `,
            [
                Number(farm_id),

                cropCycleId,

                expense_date,

                category,

                Number(amount),

                description?.trim() || null,

                notes?.trim() || null,

                expenseId
            ]
        );


        return res.status(200).json({
            success: true,
            message:
                'Pengeluaran berhasil diperbarui.'
        });

    } catch (error) {

        console.error(
            'Update expense error:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Gagal memperbarui pengeluaran.'
        });
    }
};


// =========================================
// DELETE EXPENSE
// =========================================

const deleteExpense = async (req, res) => {
    try {

        const userId = req.user.userId;
        const expenseId = req.params.id;


        const [expenses] =
            await pool.execute(
                `
                SELECT e.id

                FROM expenses e

                INNER JOIN farms f
                    ON f.id = e.farm_id

                WHERE e.id = ?
                AND f.user_id = ?
                `,
                [
                    expenseId,
                    userId
                ]
            );


        if (expenses.length === 0) {

            return res.status(404).json({
                success: false,
                message:
                    'Pengeluaran tidak ditemukan.'
            });
        }


        await pool.execute(
            `
            DELETE FROM expenses
            WHERE id = ?
            `,
            [expenseId]
        );


        return res.status(200).json({
            success: true,
            message:
                'Pengeluaran berhasil dihapus.'
        });

    } catch (error) {

        console.error(
            'Delete expense error:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Gagal menghapus pengeluaran.'
        });
    }
};


module.exports = {
    getExpenses,
    getExpenseById,
    createExpense,
    updateExpense,
    deleteExpense
};