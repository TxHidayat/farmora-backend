const pool = require('../config/database');

// =====================================================
// GET ANALYTICS SUMMARY
// =====================================================

const getAnalyticsSummary = async (req, res) => {
    try {
        const userId = req.user.userId;

        // ==============================
        // TOTAL INCOME
        // ==============================

        const [incomeResult] = await pool.execute(
            `SELECT
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
             WHERE farms.user_id = ?`,
            [userId]
        );

        // ==============================
        // TOTAL EXPENSES
        // ==============================

        const [expenseResult] = await pool.execute(
            `SELECT
                COALESCE(
                    SUM(e.amount),
                    0
                ) AS total_expenses
             FROM expenses e
             INNER JOIN farms
                ON farms.id = e.farm_id
             WHERE farms.user_id = ?`,
            [userId]
        );

        // ==============================
        // TOTAL HARVEST
        // ==============================

        const [harvestResult] = await pool.execute(
            `SELECT
                COALESCE(
                    SUM(h.quantity),
                    0
                ) AS total_harvest
             FROM harvests h
             INNER JOIN crop_cycles cc
                ON cc.id = h.crop_cycle_id
             INNER JOIN fields f
                ON f.id = cc.field_id
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE farms.user_id = ?`,
            [userId]
        );

        const totalIncome = Number(
            incomeResult[0].total_income
        );

        const totalExpenses = Number(
            expenseResult[0].total_expenses
        );

        const totalHarvest = Number(
            harvestResult[0].total_harvest
        );

        const estimatedProfit =
            totalIncome - totalExpenses;

        return res.status(200).json({
            success: true,
            data: {
                total_income: totalIncome,
                total_expenses: totalExpenses,
                estimated_profit: estimatedProfit,
                total_harvest: totalHarvest
            }
        });

    } catch (error) {

        console.error(
            'Get analytics summary error:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Gagal mengambil ringkasan analytics.'
        });
    }
};


// =====================================================
// GET PRODUCTIVITY ANALYTICS
// =====================================================

const getProductivityAnalytics = async (req, res) => {
    try {
        const userId = req.user.userId;

        const [rows] = await pool.execute(
            `SELECT
                cc.id AS crop_cycle_id,
                cc.crop_name,
                cc.variety,
                cc.plant_count,

                f.id AS field_id,
                f.name AS field_name,

                farms.id AS farm_id,
                farms.name AS farm_name,

                COALESCE(
                    SUM(h.quantity),
                    0
                ) AS total_harvest,

                COALESCE(
                    SUM(
                        h.quantity *
                        h.price_per_unit
                    ),
                    0
                ) AS total_income

             FROM crop_cycles cc

             INNER JOIN fields f
                ON f.id = cc.field_id

             INNER JOIN farms
                ON farms.id = f.farm_id

             LEFT JOIN harvests h
                ON h.crop_cycle_id = cc.id

             WHERE farms.user_id = ?

             GROUP BY
                cc.id,
                cc.crop_name,
                cc.variety,
                cc.plant_count,
                f.id,
                f.name,
                farms.id,
                farms.name

             ORDER BY
                total_harvest DESC`,
            [userId]
        );

        const data = rows.map((row) => {

            const plantCount =
                Number(row.plant_count || 0);

            const totalHarvest =
                Number(row.total_harvest || 0);

            const productivity =
                plantCount > 0
                    ? totalHarvest / plantCount
                    : 0;

            return {
                crop_cycle_id:
                    Number(row.crop_cycle_id),

                crop_name:
                    row.crop_name,

                variety:
                    row.variety,

                plant_count:
                    plantCount,

                field_id:
                    Number(row.field_id),

                field_name:
                    row.field_name,

                farm_id:
                    Number(row.farm_id),

                farm_name:
                    row.farm_name,

                total_harvest:
                    totalHarvest,

                productivity:
                    Number(
                        productivity.toFixed(4)
                    ),

                total_income:
                    Number(row.total_income || 0)
            };
        });

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {

        console.error(
            'Get productivity analytics error:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Gagal mengambil data produktivitas.'
        });
    }
};


// =====================================================
// GET EXPENSE ANALYTICS
// =====================================================

const getExpenseAnalytics = async (req, res) => {
    try {
        const userId = req.user.userId;

        const [rows] = await pool.execute(
            `SELECT
                e.category,
                COUNT(*) AS transaction_count,
                COALESCE(
                    SUM(e.amount),
                    0
                ) AS total_amount

             FROM expenses e

             INNER JOIN farms
                ON farms.id = e.farm_id

             WHERE farms.user_id = ?

             GROUP BY e.category

             ORDER BY total_amount DESC`,
            [userId]
        );

        const allowedCategories = [
            'bibit',
            'pupuk',
            'pestisida',
            'tenaga_kerja'
        ];

        const data = allowedCategories.map(
            (category) => {

                const existing = rows.find(
                    (row) =>
                        row.category === category
                );

                return {
                    category,

                    transaction_count:
                        existing
                            ? Number(
                                existing.transaction_count
                            )
                            : 0,

                    total_amount:
                        existing
                            ? Number(
                                existing.total_amount
                            )
                            : 0
                };
            }
        );

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {

        console.error(
            'Get expense analytics error:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Gagal mengambil data pengeluaran.'
        });
    }
};


// =====================================================
// GET FARM ANALYTICS
// =====================================================

const getFarmAnalytics = async (req, res) => {
    try {
        const userId = req.user.userId;

        const [rows] = await pool.execute(
            `SELECT
                farms.id AS farm_id,
                farms.name AS farm_name,

                COUNT(
                    DISTINCT f.id
                ) AS total_fields,

                COUNT(
                    DISTINCT cc.id
                ) AS total_crop_cycles,

                COALESCE(
                    SUM(
                        DISTINCT
                        h.quantity *
                        h.price_per_unit
                    ),
                    0
                ) AS total_income

             FROM farms

             LEFT JOIN fields f
                ON f.farm_id = farms.id

             LEFT JOIN crop_cycles cc
                ON cc.field_id = f.id

             LEFT JOIN harvests h
                ON h.crop_cycle_id = cc.id

             WHERE farms.user_id = ?

             GROUP BY
                farms.id,
                farms.name

             ORDER BY farms.name ASC`,
            [userId]
        );

        /*
         * Pengeluaran dihitung terpisah agar JOIN
         * dengan harvests tidak menggandakan nominal.
         */

        const [expenseRows] = await pool.execute(
            `SELECT
                e.farm_id,
                COALESCE(
                    SUM(e.amount),
                    0
                ) AS total_expenses

             FROM expenses e

             INNER JOIN farms
                ON farms.id = e.farm_id

             WHERE farms.user_id = ?

             GROUP BY e.farm_id`,
            [userId]
        );

        const data = rows.map((row) => {

            const farmId =
                Number(row.farm_id);

            const totalIncome =
                Number(row.total_income || 0);

            const expense =
                expenseRows.find(
                    (item) =>
                        Number(item.farm_id) === farmId
                );

            const totalExpenses =
                expense
                    ? Number(
                        expense.total_expenses
                    )
                    : 0;

            return {
                farm_id: farmId,

                farm_name:
                    row.farm_name,

                total_fields:
                    Number(row.total_fields),

                total_crop_cycles:
                    Number(row.total_crop_cycles),

                total_income:
                    totalIncome,

                total_expenses:
                    totalExpenses,

                estimated_profit:
                    totalIncome -
                    totalExpenses
            };
        });

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {

        console.error(
            'Get farm analytics error:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Gagal mengambil analytics kebun.'
        });
    }
};


// =====================================================
// EXPORT
// =====================================================

module.exports = {
    getAnalyticsSummary,
    getProductivityAnalytics,
    getExpenseAnalytics,
    getFarmAnalytics
};