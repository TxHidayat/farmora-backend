const pool = require('../config/database');

const getAlerts = async (req, res) => {
    try {
        const userId = req.user.userId;

        const alerts = [];

        // =========================================
        // AMBIL CROP CYCLES
        // =========================================

        const [cropCycles] = await pool.query(
            `
            SELECT
                cc.id,
                cc.crop_name,
                cc.variety,
                cc.status,
                cc.estimated_harvest_date,
                f.name AS field_name,
                fm.name AS farm_name
            FROM crop_cycles cc
            INNER JOIN fields f
                ON cc.field_id = f.id
            INNER JOIN farms fm
                ON f.farm_id = fm.id
            WHERE fm.user_id = ?
            ORDER BY cc.estimated_harvest_date ASC
            `,
            [userId]
        );


        // =========================================
        // CEK SETIAP CROP CYCLE
        // =========================================

        for (const crop of cropCycles) {

            if (!crop.estimated_harvest_date) {
                continue;
            }

            const today = new Date();

            today.setHours(
                0,
                0,
                0,
                0
            );

            const harvestDate = new Date(
                `${crop.estimated_harvest_date
                    .toISOString()
                    .split('T')[0]}T00:00:00`
            );

            const difference =
                Math.ceil(
                    (
                        harvestDate - today
                    ) /
                    (
                        1000 *
                        60 *
                        60 *
                        24
                    )
                );


            // =====================================
            // PANEN TERLEWAT
            // =====================================

            if (
                difference < 0 &&
                crop.status !== 'selesai'
            ) {

                alerts.push({

                    type: 'danger',

                    title:
                        `${crop.crop_name} melewati estimasi panen`,

                    message:
                        `Estimasi panen sudah lewat ${Math.abs(
                            difference
                        )} hari.`,

                    crop_name:
                        crop.crop_name,

                    farm_name:
                        crop.farm_name,

                    field_name:
                        crop.field_name,

                    date:
                        crop.estimated_harvest_date,

                });

                continue;
            }


            // =====================================
            // MENDEKATI PANEN
            // =====================================

            if (
                difference >= 0 &&
                difference <= 7 &&
                crop.status !== 'selesai'
            ) {

                alerts.push({

                    type: 'warning',

                    title:
                        `${crop.crop_name} mendekati estimasi panen`,

                    message:
                        difference === 0
                            ? 'Estimasi panen adalah hari ini.'
                            : `Estimasi panen dalam ${difference} hari.`,

                    crop_name:
                        crop.crop_name,

                    farm_name:
                        crop.farm_name,

                    field_name:
                        crop.field_name,

                    date:
                        crop.estimated_harvest_date,

                });

            }
        }


        // =========================================
        // CEK CROP TANPA AKTIVITAS
        // =========================================

        const [withoutActivities] =
            await pool.query(
                `
                SELECT
                    cc.id,
                    cc.crop_name,
                    f.name AS field_name,
                    fm.name AS farm_name
                FROM crop_cycles cc
                INNER JOIN fields f
                    ON cc.field_id = f.id
                INNER JOIN farms fm
                    ON f.farm_id = fm.id
                LEFT JOIN activities a
                    ON a.crop_cycle_id = cc.id
                WHERE fm.user_id = ?
                GROUP BY
                    cc.id,
                    cc.crop_name,
                    f.name,
                    fm.name
                HAVING COUNT(a.id) = 0
                `,
                [userId]
            );


        for (const crop of withoutActivities) {

            alerts.push({

                type: 'info',

                title:
                    `${crop.crop_name} belum memiliki aktivitas`,

                message:
                    'Belum ada aktivitas yang tercatat untuk siklus tanaman ini.',

                crop_name:
                    crop.crop_name,

                farm_name:
                    crop.farm_name,

                field_name:
                    crop.field_name,

            });
        }


        // =========================================
        // URUTKAN ALERT
        // =========================================

        const priority = {
            danger: 1,
            warning: 2,
            info: 3,
        };

        alerts.sort(
            (a, b) =>
                priority[a.type] -
                priority[b.type]
        );


        // =========================================
        // RESPONSE
        // =========================================

        return res.json({

            success: true,

            data: {
                total: alerts.length,
                alerts,
            },

        });

    } catch (error) {

        console.error(
            'Get alerts error:',
            error
        );

        return res.status(500).json({

            success: false,

            message:
                'Gagal mengambil data alert.',

        });

    }
};


module.exports = {
    getAlerts,
};