require('dotenv').config();

const app = require('./src/app');
const pool = require('./src/config/database');

const PORT = process.env.PORT || 5000;


// =====================================================
// START SERVER
// =====================================================

async function startServer() {

    try {

        const connection =
            await pool.getConnection();

        console.log(
            'MySQL connected successfully'
        );

        connection.release();


        app.listen(
            PORT,
            () => {

                console.log(
                    `FARMORA API running on http://localhost:${PORT}`
                );

            }
        );

    } catch (error) {

        console.error(
            'MySQL connection failed:',
            error.message
        );

        process.exit(1);

    }

}


startServer();