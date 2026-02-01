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

// OpenWeatherMap API key (Free Tier) - kept for reference if needed later
// const API_KEY = 'e4de2172778749a1d82054ff46b784b0';

export const fetchWeather = async (lat: number, lon: number): Promise<WeatherData> => {
    try {
        // Use Open-Meteo which is free and requires no API key (avoiding 401 errors)
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto`
        );

        if (!response.ok) throw new Error('Weather API failed');

        const data = await response.json();
        const current = data.current;
        const code = current.weather_code;
        const temp = Math.round(current.temperature_2m);

        // Map WMO codes to conditions and icons
        const weatherMap: Record<number, { condition: string, icon: string, description: string }> = {
            0: { condition: 'Clear', icon: 'Sun', description: 'Mainly clear skies' },
            1: { condition: 'Mainly Clear', icon: 'CloudSun', description: 'Slightly overcast' },
            2: { condition: 'Partly Cloudy', icon: 'Cloud', description: 'Scattered clouds' },
            3: { condition: 'Overcast', icon: 'Cloud', description: 'Dense cloud cover' },
            45: { condition: 'Fog', icon: 'Cloud', description: 'Foggy conditions' },
            48: { condition: 'Fog', icon: 'Cloud', description: 'Depositing rime fog' },
            51: { condition: 'Drizzle', icon: 'CloudDrizzle', description: 'Light drizzle' },
            53: { condition: 'Drizzle', icon: 'CloudDrizzle', description: 'Moderate drizzle' },
            55: { condition: 'Drizzle', icon: 'CloudDrizzle', description: 'Dense drizzle' },
            61: { condition: 'Rain', icon: 'CloudRain', description: 'Slight rain' },
            63: { condition: 'Rain', icon: 'CloudRain', description: 'Moderate rain' },
            65: { condition: 'Rain', icon: 'CloudRain', description: 'Heavy rain' },
            71: { condition: 'Snow', icon: 'Snowflake', description: 'Slight snow' },
            73: { condition: 'Snow', icon: 'Snowflake', description: 'Moderate snow' },
            75: { condition: 'Snow', icon: 'Snowflake', description: 'Heavy snow' },
            95: { condition: 'Storm', icon: 'Zap', description: 'Thunderstorms' }
        };

        const config = weatherMap[code] || { condition: 'Mixed', icon: 'Cloud', description: 'Changeable weather' };

        // C-Store Specific Insights
        let insight = "Standard operational mode.";
        if (temp > 85) insight = "High Temp: Check Ice levels & Cold Bev inventory.";
        if (temp < 40) insight = "Cold: Prepare Coffee & ensure windshield fluid availability.";
        if (current.precipitation > 0) insight = "Rain: Promote Car Wash discount for 'Rain Check' guarantee.";
        if (code >= 95) insight = "Storm: Ensure fuel island drainage is clear.";
        if (current.wind_speed_10m > 20) insight = "Windy: Check outdoor trash bins and signage.";

        return {
            temp: temp,
            condition: config.condition,
            description: config.description,
            icon: config.icon,
            insight: insight,
            precip: current.precipitation,
            humidity: current.relative_humidity_2m,
            windSpeed: Math.round(current.wind_speed_10m),
            isDay: current.is_day === 1
        };
    } catch (error: any) {
        console.error('Weather fetch failed:', error.message || error);
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
