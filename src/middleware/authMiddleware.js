
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Token tidak ditemukan'
            });
        }

        const parts = authHeader.split(' ');

        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res.status(401).json({
                success: false,
                message: 'Format token tidak valid'
            });
        }

        const token = parts[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        if (!decoded.userId) {
            return res.status(401).json({
                success: false,
                message: 'Token tidak valid'
            });
        }

        // Ambil status demo terbaru dari database.
        const [rows] = await pool.execute(
            'SELECT id, is_demo FROM users WHERE id = ? LIMIT 1',
            [decoded.userId]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Pengguna tidak ditemukan'
            });
        }

        const isDemo = Boolean(rows[0].is_demo);

        req.user = {
            ...decoded,
            userId: rows[0].id,
            isDemo,
            is_demo: isDemo
        };

        next();
    } catch (error) {
        if (
            error.name !== 'JsonWebTokenError' &&
            error.name !== 'TokenExpiredError'
        ) {
            console.error('Authentication error:', error.message);
        }

        return res.status(401).json({
            success: false,
            message: 'Token tidak valid atau sudah kedaluwarsa'
        });
    }
};

module.exports = authenticateToken;
