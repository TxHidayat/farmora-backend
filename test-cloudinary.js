
require('dotenv').config({ override: true });

const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API Key Length:', process.env.CLOUDINARY_API_KEY?.length);
console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? 'TERISI' : 'KOSONG');

cloudinary.api.ping()
    .then(result => {
        console.log('Cloudinary berhasil terhubung:', result);
    })
    .catch(error => {
        console.error('Cloudinary gagal:', error.message);
    });
