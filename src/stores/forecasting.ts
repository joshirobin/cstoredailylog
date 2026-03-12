import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface ForecastData {
    date: string;
    actualSales?: number;
    predictedSales: number;
    weatherCondition?: 'sunny' | 'rainy' | 'cloudy' | 'snowy';
    specialEvent?: string; // e.g., "Super Bowl", "Holiday"
}

export interface Anomaly {
    id: string;
    type: 'INVENTORY_DROP' | 'SALES_SPIKE' | 'CASH_VARIANCE' | 'TEMP_Deviation';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    detectedAt: string; // ISO Date
    metric: string; // e.g., "Diesel Fuel Level"
    expectedValue: number;
    actualValue: number;
    status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
}

export const useForecastingStore = defineStore('forecasting', () => {
    // State
    const salesForecast = ref<ForecastData[]>([]);
    const anomalies = ref<Anomaly[]>([]);
    const loading = ref(false);

    // Mock AI Generation Logic
    // In production, this would call a cloud function (OpenAI/Gemini/Vertex AI)
    const generateForecast = async (days = 7) => {
        loading.value = true;

        // Simulating API delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        const today = new Date();
        const baseSales = 4500; // Average daily sales
        const data: ForecastData[] = [];

        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateStr = date.toISOString().split('T')[0] as string;

            // Artificial "AI" Variance Factors
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const seasonalFactor = Math.sin(i * 0.5) * 200; // Slight wave
            const randomNoise = (Math.random() - 0.5) * 300;

            let prediction = baseSales + (isWeekend ? 1200 : 0) + seasonalFactor + randomNoise;

            // Historical (Actual) data for past dates if we were looking back, 
            // but for forecast we only have prediction.

            data.push({
                date: dateStr,
                predictedSales: Math.round(prediction),
                weatherCondition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)] as 'sunny' | 'cloudy' | 'rainy'
            });
        }

        salesForecast.value = data;
        loading.value = false;
    };

    const detectAnomalies = async () => {
        // Simulating anomaly detection scan
        // In real app, this analyzes recent transaction logs & sensor data
        loading.value = true;
        await new Promise(resolve => setTimeout(resolve, 1000));

        anomalies.value = [
            {
                id: 'anm-001',
                type: 'INVENTORY_DROP',
                severity: 'HIGH',
                metric: 'Diesel Fuel Inventory',
                description: 'Rapid inventory depletion detected between 2:00 AM - 4:00 AM with zero corresponding pump transactions.',
                detectedAt: new Date().toISOString(),
                expectedValue: 4500, // Gallons
                actualValue: 4200,
                status: 'NEW'
            },
            {
                id: 'anm-002',
                type: 'CASH_VARIANCE',
                severity: 'MEDIUM',
                metric: 'Register 2 Cash Drawer',
                description: 'End of shift count deviates from expected cash based on sales logs.',
                detectedAt: new Date(Date.now() - 3600000).toISOString(),
                expectedValue: 1250.00,
                actualValue: 1215.50,
                status: 'NEW'
            },
            {
                id: 'anm-003',
                type: 'SALES_SPIKE',
                severity: 'LOW',
                metric: 'Energy Drinks Category',
                description: 'Unusual spike in Red Bull sales (+400%) compared to 4-week moving average.',
                detectedAt: new Date(Date.now() - 7200000).toISOString(),
                expectedValue: 45, // Units
                actualValue: 180,
                status: 'ACKNOWLEDGED'
            }
        ];
        loading.value = false;
    };

    const acknowledgeAnomaly = (id: string) => {
        const anomaly = anomalies.value.find(a => a.id === id);
        if (anomaly) anomaly.status = 'ACKNOWLEDGED';
    };

    const resolveAnomaly = (id: string) => {
        const anomaly = anomalies.value.find(a => a.id === id);
        if (anomaly) anomaly.status = 'RESOLVED';
    };

    return {
        salesForecast,
        anomalies,
        loading,
        generateForecast,
        detectAnomalies,
        acknowledgeAnomaly,
        resolveAnomaly
    };
});
