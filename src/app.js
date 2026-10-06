const express = require('express');
const cors = require('cors');
const path = require('path');


// =====================================================
// ROUTES
// =====================================================

const authRoutes =
    require('./routes/authRoutes');

const farmRoutes =
    require('./routes/farmRoutes');

const fieldRoutes =
    require('./routes/fieldRoutes');

const cropCycleRoutes =
    require('./routes/cropCycleRoutes');

const activityRoutes =
    require('./routes/activityRoutes');

const harvestRoutes =
    require('./routes/harvestRoutes');

const expenseRoutes =
    require('./routes/expenseRoutes');

const dashboardRoutes =
    require('./routes/dashboardRoutes');

const reportRoutes =
    require('./routes/reportRoutes');

const weatherRoutes =
    require('./routes/weatherRoutes');

const analyticsRoutes =
    require('./routes/analyticsRoutes');

const alertRoutes =
    require('./routes/alertRoutes');

const aiDetectionRoutes =
    require('./routes/aiDetectionRoutes');

const quickScanRoutes =
    require('./routes/quickScanRoutes');


// =====================================================
// APP
// =====================================================

const app = express();


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());

app.use(express.json());


// =====================================================
// STATIC UPLOAD FILES
// =====================================================
//
// File yang berada di:
// backend/uploads/
//
// dapat diakses melalui:
// http://localhost:5000/uploads/...
//
// Contoh:
// /uploads/quick-scans/nama-file.jpg
//

app.use(
    '/uploads',
    express.static(
        path.join(
            process.cwd(),
            'uploads'
        )
    )
);


// =====================================================
// ROOT
// =====================================================

app.get(
    '/',
    (req, res) => {

        res.status(200).json({

            success: true,

            message:
                'FARMORA API is running'

        });

    }
);


// =====================================================
// API ROUTES
// =====================================================

app.use(
    '/api/auth',
    authRoutes
);

app.use(
    '/api/farms',
    farmRoutes
);

app.use(
    '/api/fields',
    fieldRoutes
);

app.use(
    '/api/crop-cycles',
    cropCycleRoutes
);

app.use(
    '/api/activities',
    activityRoutes
);

app.use(
    '/api/harvests',
    harvestRoutes
);

app.use(
    '/api/expenses',
    expenseRoutes
);

app.use(
    '/api/dashboard',
    dashboardRoutes
);

app.use(
    '/api/reports',
    reportRoutes
);

app.use(
    '/api/weather',
    weatherRoutes
);

app.use(
    '/api/analytics',
    analyticsRoutes
);

app.use(
    '/api/alerts',
    alertRoutes
);


// =====================================================
// AI DETECTION
// =====================================================

app.use(
    '/api/ai-detection',
    aiDetectionRoutes
);


// =====================================================
// QUICK PLANT SCAN
// =====================================================

app.use(
    '/api/ai-detection',
    quickScanRoutes
);


// =====================================================
// 404
// =====================================================

app.use(
    (req, res) => {

        res.status(404).json({

            success: false,

            message:
                'Endpoint tidak ditemukan'

        });

    }
);


// =====================================================
// EXPORT
// =====================================================

module.exports = app;