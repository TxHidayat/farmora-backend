const weatherService = require('../services/weatherService');

const getWeather = async (req, res) => {
    try {
        const { lat, lon } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({
                success: false,
                message: 'Parameter lat dan lon wajib diisi.',
            });
        }

        const latitude = Number(lat);
        const longitude = Number(lon);

        if (
            Number.isNaN(latitude) ||
            Number.isNaN(longitude)
        ) {
            return res.status(400).json({
                success: false,
                message: 'lat dan lon harus berupa angka.',
            });
        }

        const weather = await weatherService.getWeather(
            latitude,
            longitude
        );

        return res.status(200).json({
            success: true,
            data: weather,
        });
    } catch (error) {
        console.error(
            'Get weather error:',
            error.response?.data || error.message
        );

        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil data cuaca.',
        });
    }
};

module.exports = {
    getWeather,
};