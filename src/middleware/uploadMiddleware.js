
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Netlify Functions menggunakan filesystem sementara.
// Lokal tetap memakai folder uploads/plant-images.
const isNetlify = Boolean(process.env.NETLIFY);

const uploadDirectory = isNetlify
    ? path.join(os.tmpdir(), 'uploads', 'plant-images')
    : path.join(
        process.cwd(),
        'uploads',
        'plant-images'
    );

// Buat folder hanya pada filesystem yang dapat ditulisi.
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
            `plant-${Date.now()}-${Math.round(
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
