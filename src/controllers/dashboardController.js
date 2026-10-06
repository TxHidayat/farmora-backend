const pool = require('../config/database');

// ==============================
// GET DASHBOARD
// ==============================

const getDashboard = async (req, res) => {

    try {

        const userId = req.user.userId;

        // ==============================
        // TOTAL FARMS
        // ==============================

        const [farmResult] = await pool.execute(
            `SELECT COUNT(*) AS total_farms
             FROM farms
             WHERE user_id = ?`,
            [userId]
        );

        // ==============================
        // TOTAL FIELDS
        // ==============================

        const [fieldResult] = await pool.execute(
            `SELECT COUNT(*) AS total_fields
             FROM fields f
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE farms.user_id = ?`,
            [userId]
        );

        // ==============================
        // TOTAL CROP CYCLES
        // ==============================

        const [cropCycleResult] = await pool.execute(
            `SELECT COUNT(*) AS total_crop_cycles
             FROM crop_cycles cc
             INNER JOIN fields f
                ON f.id = cc.field_id
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE farms.user_id = ?`,
            [userId]
        );

        // ==============================
        // ACTIVE CROP CYCLES
        // ==============================

        const [activeCropResult] = await pool.execute(
            `SELECT COUNT(*) AS active_crop_cycles
             FROM crop_cycles cc
             INNER JOIN fields f
                ON f.id = cc.field_id
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE farms.user_id = ?
             AND cc.status NOT IN ('selesai', 'gagal')`,
            [userId]
        );

        // ==============================
        // TOTAL ACTIVITIES
        // ==============================

        const [activityResult] = await pool.execute(
            `SELECT COUNT(*) AS total_activities
             FROM activities a
             INNER JOIN crop_cycles cc
                ON cc.id = a.crop_cycle_id
             INNER JOIN fields f
                ON f.id = cc.field_id
             INNER JOIN farms
                ON farms.id = f.farm_id
             WHERE farms.user_id = ?`,
            [userId]
        );

        // ==============================
        // TOTAL HARVEST
        // ==============================

        const [harvestResult] = await pool.execute(
            `SELECT
                COALESCE(SUM(h.quantity), 0) AS total_harvest_quantity,
                COALESCE(SUM(h.quantity * h.price_per_unit), 0) AS total_income
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
                COALESCE(SUM(e.amount), 0) AS total_expenses
             FROM expenses e
             INNER JOIN farms
                ON farms.id = e.farm_id
             WHERE farms.user_id = ?`,
            [userId]
        );

        // ==============================
        // CALCULATE PROFIT
        // ==============================

        const totalIncome = Number(
            harvestResult[0].total_income
        );

        const totalExpenses = Number(
            expenseResult[0].total_expenses
        );

        const estimatedProfit =
            totalIncome - totalExpenses;

        // ==============================
        // RESPONSE
        // ==============================

        return res.status(200).json({
            success: true,
            data: {

                farms: {
                    total: Number(
                        farmResult[0].total_farms
                    )
                },

                fields: {
                    total: Number(
                        fieldResult[0].total_fields
                    )
                },

                crops: {
                    total: Number(
                        cropCycleResult[0].total_crop_cycles
                    ),
                    active: Number(
                        activeCropResult[0].active_crop_cycles
                    )
                },

                activities: {
                    total: Number(
                        activityResult[0].total_activities
                    )
                },

                harvest: {
                    total_quantity: Number(
                        harvestResult[0].total_harvest_quantity
                    ),
                    total_income: totalIncome
                },

                finances: {
                    total_expenses: totalExpenses,
                    estimated_profit: estimatedProfit
                }

            }
        });

    } catch (error) {

        console.error(
            'Get dashboard error:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};


// ==============================
// GET FINANCE CHART
// ==============================

const getFinanceChart = async (req, res) => {

    try {

        const userId = req.user.userId;

        const [rows] = await pool.execute(
            `
            SELECT
                months.month,
                COALESCE(
                    harvest_data.income,
                    0
                ) AS income,
                COALESCE(
                    expense_data.expenses,
                    0
                ) AS expenses

            FROM (

                SELECT 1 AS month
                UNION SELECT 2
                UNION SELECT 3
                UNION SELECT 4
                UNION SELECT 5
                UNION SELECT 6
                UNION SELECT 7
                UNION SELECT 8
                UNION SELECT 9
                UNION SELECT 10
                UNION SELECT 11
                UNION SELECT 12

            ) AS months

            LEFT JOIN (

                SELECT
                    MONTH(h.harvest_date) AS month,
                    SUM(
                        h.quantity * h.price_per_unit
                    ) AS income

                FROM harvests h

                INNER JOIN crop_cycles cc
                    ON cc.id = h.crop_cycle_id

                INNER JOIN fields f
                    ON f.id = cc.field_id

                INNER JOIN farms
                    ON farms.id = f.farm_id

                WHERE farms.user_id = ?

                GROUP BY MONTH(h.harvest_date)

            ) AS harvest_data

                ON months.month =
                   harvest_data.month

            LEFT JOIN (

                SELECT
                    MONTH(e.expense_date) AS month,
                    SUM(e.amount) AS expenses

                FROM expenses e

                INNER JOIN farms
                    ON farms.id = e.farm_id

                WHERE farms.user_id = ?

                GROUP BY MONTH(e.expense_date)

            ) AS expense_data

                ON months.month =
                   expense_data.month

            ORDER BY months.month
            `,
            [
                userId,
                userId
            ]
        );

        const monthNames = [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'Mei',
            'Jun',
            'Jul',
            'Agu',
            'Sep',
            'Okt',
            'Nov',
            'Des'
        ];

        const data = rows.map((row) => ({
            month: monthNames[
                Number(row.month) - 1
            ],

            income: Number(row.income),

            expenses: Number(row.expenses)
        }));

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {

        console.error(
            'Get finance chart error:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Gagal mengambil data grafik keuangan.'
        });
    }
};


// ==============================
// EXPORT
// ==============================

module.exports = {
    getDashboard,
    getFinanceChart
};