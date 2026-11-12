require('dotenv').config({ override: true });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function testConnection() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: {
                ca: fs.readFileSync(
                    path.join(__dirname, 'isrgrootx1.pem')
                )
            }
        });

        const [rows] = await connection.query(
            'SELECT VERSION() AS version, DATABASE() AS db'
        );

        console.log('Koneksi TiDB berhasil!');
        console.log(rows);

        await connection.end();
    } catch (error) {
        console.error('Koneksi gagal:', error.message);
    }
}

testConnection();
