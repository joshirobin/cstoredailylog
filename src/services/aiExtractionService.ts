import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ExtractedFuelInvoice {
    invoiceNumber: string;
    supplier: string;
    date: string;
    items: {
        type: string;
        gallons: number;
        costPerGal: number;
        taxes: number;
        totalCost: number;
    }[];
    totalAmount: number;
}

const prompt = `
Extract data from this fuel Bill of Lading (BOL) or Invoice. 
Return ONLY a JSON object with this exact structure:
{
    "invoiceNumber": "string",
    "supplier": "string",
    "date": "YYYY-MM-DD",
    "items": [
        {
            "type": "Regular|Plus|Premium|Diesel|Kerosene",
            "gallons": number,
            "costPerGal": number,
            "taxes": number,
            "totalCost": number
        }
    ],
    "totalAmount": number
}

Rules:
1. Try to match fuel types to: Regular, Plus, Premium, Diesel, or Kerosene.
2. If "taxes" are not explicitly shown per product, set to 0 and ensure "totalCost" matches the line total.
3. Cost per gallon (CPG) should be the net price before taxes if possible.
4. If a field is missing, use empty string for strings and 0 for numbers.
5. Accuracy is critical. Double check decimals.
`;

export async function extractFuelInvoiceData(apiKey: string, file: File | string): Promise<ExtractedFuelInvoice | null> {
    try {
        console.log("AI Extraction: Starting process...");
        const cleanKey = apiKey.trim();
        console.log(`AI Extraction: Using API Key starting with: ${cleanKey.substring(0, 8)}...`);
        const genAI = new GoogleGenerativeAI(cleanKey);

        // Use standard model name
        let model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        let fileData: string;
        let mimeType: string;

        if (file instanceof File) {
            mimeType = file.type;
            fileData = await fileToBase64(file);
        } else {
            const parts = file.split(';base64,');
            if (parts.length < 2) throw new Error("Invalid base64 string");
            const mimeInfo = parts[0]?.split(':')[1];
            if (!mimeInfo) throw new Error("Invalid mime type info");
            mimeType = mimeInfo;
            fileData = parts[1] || "";
        }

        console.log(`AI Extraction: Uploading ${mimeType} (${Math.round(fileData.length / 1024)}KB)`);

        let result;
        try {
            result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: fileData,
                        mimeType: mimeType
                    }
                }
            ]);
        } catch (error: any) {
            console.warn("Gemini 1.5 Flash failed, trying Pro fallback...", error);
            // Fallback to Pro
            model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
            result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: fileData,
                        mimeType: mimeType
                    }
                }
            ]);
        }

        const response = await result.response;
        const text = response.text();
        console.log("AI Extraction: Raw Response:", text);

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log("AI Extraction: Parsed Data:", parsed);
            return parsed as ExtractedFuelInvoice;
        }

        return null;
    } catch (error) {
        console.error("AI Extraction Error:", error);
        throw error;
    }
}

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string | null;
            if (result && result.indexOf(',') !== -1) {
                resolve(result.split(',')[1] as string);
            } else {
                reject(new Error("Failed to read file"));
            }
        };
        reader.onerror = error => reject(error);
    });
}
