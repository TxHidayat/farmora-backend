const axios = require('axios');

const getWeather = async (latitude, longitude) => {
    const apiKey = process.env.WEATHER_API_KEY;

    if (!apiKey) {
        throw new Error('WEATHER_API_KEY belum dikonfigurasi');
    }

    const response = await axios.get(
        'https://api.openweathermap.org/data/2.5/weather',
        {
            params: {
                lat: latitude,
                lon: longitude,
                appid: apiKey,
                units: 'metric',
                lang: 'id',
            },
        }
    );

    const data = response.data;

    return {
        location: data.name,
        temperature: data.main.temp,
        feels_like: data.main.feels_like,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        wind_speed: data.wind.speed,
        weather: data.weather[0]?.description || '',
        weather_main: data.weather[0]?.main || '',
        icon: data.weather[0]?.icon || '',
    };
};

module.exports = {
    getWeather,
};