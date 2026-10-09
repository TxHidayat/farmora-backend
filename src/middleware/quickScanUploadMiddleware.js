
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

const isNetlify = Boolean(
    process.env.NETLIFY ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
);

const uploadDirectory = isNetlify
    ? path.join(os.tmpdir(), 'uploads', 'quick-scans')
    : path.join(
        process.cwd(),
        'uploads',
        'quick-scans'
    );

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, {
        recursive: true,
    });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },

    filename: (req, file, cb) => {
        const extension = path
            .extname(file.originalname)
            .toLowerCase();

        const uniqueName =
            `quick-scan-${Date.now()}-${Math.round(
                Math.random() * 1e9
            )}${extension}`;

        cb(null, uniqueName);
    },
});

const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
];

const fileFilter = (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                'Format gambar harus JPG, PNG, atau WEBP.'
            )
        );
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
});

module.exports = upload;
