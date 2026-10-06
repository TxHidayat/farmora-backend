const pool = require('../config/database');

/**
 * Validasi tanggal
 */
const isValidDate = (date) => {
    return /^\d{4}-\d{2}-\d{2}$/.test(date);
};


/**
 * GET /api/reports/summary
 *
 * Contoh:
 * /api/reports/summary?start_date=2026-09-01&end_date=2026-09-30
 */
const getReportSummary = async (req, res) => {
    try {
        const userId = req.user.userId;

        const { start_date, end_date } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: 'start_date dan end_date wajib diisi'
            });
        }

        if (!isValidDate(start_date) || !isValidDate(end_date)) {
            return res.status(400).json({
                success: false,
                message: 'Format tanggal harus YYYY-MM-DD'
            });
        }

        if (start_date > end_date) {
            return res.status(400).json({
                success: false,
                message: 'start_date tidak boleh lebih besar dari end_date'
            });
        }

        // =========================
        // TOTAL PANEN & PENDAPATAN
        // =========================

        const [harvestResult] = await pool.execute(
            `SELECT
                COALESCE(SUM(h.quantity), 0) AS total_harvest_quantity,
                COALESCE(
                    SUM(h.quantity * h.price_per_unit),
                    0
                ) AS total_income
             FROM harvests h
             INNER JOIN crop_cycles cc
                ON cc.id = h.crop_cycle_id
             INNER JOIN fields f
                ON f.id = cc.field_id
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE farms.user_id = ?
             AND h.harvest_date BETWEEN ? AND ?`,
            [userId, start_date, end_date]
        );


        // =========================
        // TOTAL PENGELUARAN
        // =========================

        const [expenseResult] = await pool.execute(
            `SELECT
                COALESCE(SUM(e.amount), 0) AS total_expenses
             FROM expenses e
             INNER JOIN farms
                ON farms.id = e.farm_id
             WHERE farms.user_id = ?
             AND e.expense_date BETWEEN ? AND ?`,
            [userId, start_date, end_date]
        );


        // =========================
        // TOTAL AKTIVITAS
        // =========================

        const [activityResult] = await pool.execute(
            `SELECT
                COUNT(*) AS total_activities
             FROM activities a
             INNER JOIN crop_cycles cc
                ON cc.id = a.crop_cycle_id
             INNER JOIN fields f
                ON f.id = cc.field_id
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE farms.user_id = ?
             AND a.activity_date BETWEEN ? AND ?`,
            [userId, start_date, end_date]
        );


        // =========================
        // JUMLAH PANEN
        // =========================

        const [harvestCountResult] = await pool.execute(
            `SELECT
                COUNT(*) AS total_harvests
             FROM harvests h
             INNER JOIN crop_cycles cc
                ON cc.id = h.crop_cycle_id
             INNER JOIN fields f
                ON f.id = cc.field_id
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE farms.user_id = ?
             AND h.harvest_date BETWEEN ? AND ?`,
            [userId, start_date, end_date]
        );


        const totalHarvestQuantity =
            Number(harvestResult[0].total_harvest_quantity);

        const totalIncome =
            Number(harvestResult[0].total_income);

        const totalExpenses =
            Number(expenseResult[0].total_expenses);

        const estimatedProfit =
            totalIncome - totalExpenses;


        return res.status(200).json({
            success: true,

            period: {
                start_date,
                end_date
            },

            data: {
                harvest: {
                    total_harvests:
                        Number(harvestCountResult[0].total_harvests),

                    total_quantity:
                        totalHarvestQuantity
                },

                income: {
                    total:
                        totalIncome
                },

                expenses: {
                    total:
                        totalExpenses
                },

                profit: {
                    estimated:
                        estimatedProfit
                },

                activities: {
                    total:
                        Number(activityResult[0].total_activities)
                }
            }
        });

    } catch (error) {
        console.error('Get report summary error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


/**
 * GET /api/reports/harvests
 */
const getHarvestReport = async (req, res) => {
    try {
        const userId = req.user.userId;

        const { start_date, end_date } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: 'start_date dan end_date wajib diisi'
            });
        }

        const [rows] = await pool.execute(
            `SELECT
                h.id,
                DATE_FORMAT(h.harvest_date, '%Y-%m-%d') AS harvest_date,
                cc.crop_name,
                cc.variety,
                h.quantity,
                h.unit,
                h.grade,
                h.price_per_unit,
                (h.quantity * h.price_per_unit) AS total_income,
                h.notes
             FROM harvests h
             INNER JOIN crop_cycles cc
                ON cc.id = h.crop_cycle_id
             INNER JOIN fields f
                ON f.id = cc.field_id
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE farms.user_id = ?
             AND h.harvest_date BETWEEN ? AND ?
             ORDER BY h.harvest_date DESC`,
            [userId, start_date, end_date]
        );

        return res.status(200).json({
            success: true,

            period: {
                start_date,
                end_date
            },

            data: rows
        });

    } catch (error) {
        console.error('Get harvest report error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


/**
 * GET /api/reports/expenses
 */
const getExpenseReport = async (req, res) => {
    try {
        const userId = req.user.userId;

        const { start_date, end_date } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: 'start_date dan end_date wajib diisi'
            });
        }

        const [rows] = await pool.execute(
            `SELECT
                e.id,
                DATE_FORMAT(e.expense_date, '%Y-%m-%d') AS expense_date,
                e.category,
                e.amount,
                e.description,
                e.notes,
                cc.crop_name
             FROM expenses e
             INNER JOIN farms
                ON farms.id = e.farm_id
             LEFT JOIN crop_cycles cc
                ON cc.id = e.crop_cycle_id
             WHERE farms.user_id = ?
             AND e.expense_date BETWEEN ? AND ?
             ORDER BY e.expense_date DESC`,
            [userId, start_date, end_date]
        );

        return res.status(200).json({
            success: true,

            period: {
                start_date,
                end_date
            },

            data: rows
        });

    } catch (error) {
        console.error('Get expense report error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


module.exports = {
    getReportSummary,
    getHarvestReport,
    getExpenseReport
};