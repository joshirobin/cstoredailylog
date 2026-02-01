/**
 * Weather Service using Open-Meteo (Free, no API key required)
 */

export interface WeatherData {
    temp: number;
    condition: string;
    description: string;
    icon: string;
    insight: string;
    precip: number;
    humidity: number;
    windSpeed: number;
    isDay: boolean;
}


// OpenWeatherMap API key (Free Tier)
const API_KEY = 'e4de2172778749a1d82054ff46b784b0';

export const fetchWeather = async (lat: number, lon: number): Promise<WeatherData> => {
    try {
        // Fetch current weather in Imperial units (Fahrenheit, miles/hour)
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${API_KEY}`
        );

        if (!response.ok) throw new Error('Weather API failed');

        const data = await response.json();

        const code = data.weather[0].id;
        const isDay = data.weather[0].icon.includes('d');
        const temp = Math.round(data.main.temp);

        // Map Weather Conditions
        let condition = data.weather[0].main;
        let icon = 'Cloud';

        if (code >= 200 && code < 300) { condition = 'Storm'; icon = 'Zap'; }
        else if (code >= 300 && code < 600) { condition = 'Rain'; icon = 'CloudRain'; }
        else if (code >= 600 && code < 700) { condition = 'Snow'; icon = 'Snowflake'; }
        else if (code === 800) { condition = 'Clear'; icon = 'Sun'; }
        else if (code > 800) { condition = 'Cloudy'; icon = 'Cloud'; }

        // C-Store Specific Insights
        let insight = "Standard operational mode.";
        if (temp > 85) insight = "High Temp: Check Ice levels & Cold Bev inventory.";
        if (temp < 40) insight = "Cold: Prepare Coffee & ensure windshield fluid availability.";
        if (condition === 'Rain' || condition === 'Storm') insight = "Wet: Ensure nonslip mats are placed at entrances.";
        if (condition === 'Snow') insight = "Snow: Pre-salt walkways and check fluid stock.";
        if (data.wind.speed > 20) insight = "Windy: Check outdoor trash bins and signage.";

        return {
            temp: temp,
            condition: condition,
            description: data.weather[0].description,
            icon: icon,
            insight: insight,
            precip: data.rain ? (data.rain['1h'] || 0) : 0,
            humidity: data.main.humidity,
            windSpeed: Math.round(data.wind.speed),
            isDay: isDay
        };
    } catch (error) {
        console.error('Weather fetch failed:', error);
        return {
            temp: 72,
            condition: 'Clear',
            description: 'Data unavailable',
            icon: 'Sun',
            insight: 'Unable to load real-time weather logs.',
            precip: 0,
            humidity: 45,
            windSpeed: 5,
            isDay: true
        };
    }
};
