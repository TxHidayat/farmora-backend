const bcrypt = require('bcryptjs');
const pool = require('../config/database');

async function seedDemoData() {
    console.log('Seeding demo data...');

    try {
        // 1. Cek apakah user demo sudah ada
        const [existing] = await pool.execute(
            'SELECT id FROM users WHERE email = ?',
            ['demo@farmora.com']
        );

        let demoUserId;

        if (existing.length > 0) {
            demoUserId = existing[0].id;
            console.log(`Demo user already exists with ID: ${demoUserId}. Ensuring is_demo = 1...`);
            await pool.execute(
                'UPDATE users SET is_demo = 1, name = ? WHERE id = ?',
                ['Pengguna Demo (Read-Only)', demoUserId]
            );
        } else {
            const passwordHash = await bcrypt.hash('demofarmora', 10);
            const [result] = await pool.execute(
                `INSERT INTO users (name, email, password_hash, phone, is_demo)
                 VALUES (?, ?, ?, ?, 1)`,
                ['Pengguna Demo (Read-Only)', 'demo@farmora.com', passwordHash, '081299990000']
            );
            demoUserId = result.insertId;
            console.log(`Created new demo user with ID: ${demoUserId}`);
        }

        // 2. Cek apakah data demo (farms) sudah ada untuk user demo ini
        const [existingFarms] = await pool.execute(
            'SELECT id FROM farms WHERE user_id = ?',
            [demoUserId]
        );

        if (existingFarms.length > 0) {
            console.log(`Demo user already has ${existingFarms.length} farms. Skipping farm seed.`);
            return;
        }

        console.log('Creating demo farms, fields, crops, activities, harvests, and expenses...');

        // 3. Farms
        const [farm1Result] = await pool.execute(
            `INSERT INTO farms (user_id, name, location, latitude, longitude, description)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                demoUserId,
                'Kebun Percontohan Farmora',
                'Lembang, Bandung Barat',
                -6.816667,
                107.616667,
                'Kebun percontohan hortikultura modern mode demo.'
            ]
        );
        const farm1Id = farm1Result.insertId;

        const [farm2Result] = await pool.execute(
            `INSERT INTO farms (user_id, name, location, latitude, longitude, description)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                demoUserId,
                'Kebun Buah Organik',
                'Batu, Malang',
                -7.870000,
                112.520000,
                'Kebun percontohan buah-buahan organik mode demo.'
            ]
        );
        const farm2Id = farm2Result.insertId;

        // 4. Fields
        const [field1Result] = await pool.execute(
            `INSERT INTO fields (farm_id, name, area, area_unit, soil_type, location, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                farm1Id,
                'Blok A - Sayuran Daun',
                500.00,
                'm2',
                'Lempung Berpasir',
                'Greenhouse Utara',
                'Sistem hidroponik NFT & media tanam'
            ]
        );
        const field1Id = field1Result.insertId;

        const [field2Result] = await pool.execute(
            `INSERT INTO fields (farm_id, name, area, area_unit, soil_type, location, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                farm1Id,
                'Blok B - Buah Sayur',
                750.00,
                'm2',
                'Humus',
                'Lahan Terbuka Selatan',
                'Irigasi tetes otomatis'
            ]
        );
        const field2Id = field2Result.insertId;

        const [field3Result] = await pool.execute(
            `INSERT INTO fields (farm_id, name, area, area_unit, soil_type, location, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                farm2Id,
                'Blok C - Apel & Jeruk',
                1200.00,
                'm2',
                'Aluvial',
                'Lereng Bukit',
                'Kebun buah organik'
            ]
        );
        const field3Id = field3Result.insertId;

        // 5. Crop Cycles
        const [crop1Result] = await pool.execute(
            `INSERT INTO crop_cycles (field_id, crop_name, variety, planting_date, plant_count, status, estimated_harvest_date, notes)
             VALUES (?, ?, ?, '2026-09-15', 800, 'tumbuh', '2026-10-25', ?)`,
            [field1Id, 'Selada Romaine', 'Green Romaine', 'Pertumbuhan optimal, daun hijau segar']
        );
        const crop1Id = crop1Result.insertId;

        const [crop2Result] = await pool.execute(
            `INSERT INTO crop_cycles (field_id, crop_name, variety, planting_date, plant_count, status, estimated_harvest_date, notes)
             VALUES (?, ?, ?, '2026-08-10', 350, 'berbuah', '2026-10-30', ?)`,
            [field2Id, 'Tomat Cherry', 'Ruby Red', 'Mulai memerah, buah lebat']
        );
        const crop2Id = crop2Result.insertId;

        const [crop3Result] = await pool.execute(
            `INSERT INTO crop_cycles (field_id, crop_name, variety, planting_date, plant_count, status, estimated_harvest_date, notes)
             VALUES (?, ?, ?, '2025-01-10', 120, 'panen', '2026-10-15', ?)`,
            [field3Id, 'Apel Manalagi', 'Manalagi Super', 'Musim panen raya']
        );
        const crop3Id = crop3Result.insertId;

        // 6. Activities
        await pool.execute(
            `INSERT INTO activities (crop_cycle_id, activity_type, activity_date, description, quantity, unit, cost, notes)
             VALUES
             (?, 'penyiraman', '2026-10-14', 'Pemberian nutrisi AB Mix PPM 900', 200, 'liter', 45000, 'pH stabil 6.2'),
             (?, 'penyiangan', '2026-10-12', 'Pembersihan gulma sekitar pipa hidroponik', 1, 'kegiatan', 50000, 'Lahan bersih'),
             (?, 'pemangkasan', '2026-10-10', 'Pemangkasan tunas air tomat cherry', 350, 'pohon', 75000, 'Meningkatkan kualitas buah'),
             (?, 'pengendalian_hama', '2026-10-05', 'Penyemprotan pestisida nabati neem oil', 50, 'liter', 85000, 'Bebas bahan kimia sintetis')`,
            [crop1Id, crop1Id, crop2Id, crop3Id]
        );

        // 7. Harvests
        await pool.execute(
            `INSERT INTO harvests (crop_cycle_id, harvest_date, quantity, unit, grade, price_per_unit, notes)
             VALUES
             (?, '2026-09-30', 60.00, 'kg', 'Grade A', 18000.00, 'Diserap supermarket lokal'),
             (?, '2026-10-15', 250.00, 'kg', 'Super', 25000.00, 'Kualitas buah sangat manis dan renyah')`,
            [crop1Id, crop3Id]
        );

        // 8. Expenses
        await pool.execute(
            `INSERT INTO expenses (farm_id, crop_cycle_id, expense_date, category, amount, description, notes)
             VALUES
             (?, ?, '2026-09-10', 'bibit', 250000.00, 'Pembelian benih selada dan nutrisi AB Mix', 'Supplier Benih Unggul'),
             (?, ?, '2026-08-15', 'peralatan', 350000.00, 'Pemasangan selang irigasi tetes', 'Toko Tani Makmur'),
             (?, ?, '2026-10-14', 'tenaga_kerja', 400000.00, 'Upah tenaga kerja petik panen apel', '2 orang pekerja harian')`,
            [farm1Id, crop1Id, farm1Id, crop2Id, farm2Id, crop3Id]
        );

        console.log('Demo seed completed successfully!');
    } catch (err) {
        console.error('Seed error:', err);
    }
}

if (require.main === module) {
    seedDemoData().then(() => {
        pool.end();
        process.exit(0);
    });
}

module.exports = seedDemoData;
