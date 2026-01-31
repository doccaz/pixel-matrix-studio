import { GoogleGenAI, Type } from "@google/genai";

const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API Key not found. Please set REACT_APP_GEMINI_API_KEY.");
    }
    return new GoogleGenAI({ apiKey });
};

export const generateIconBitmap = async (
    prompt: string, 
    width: number, 
    height: number
): Promise<{ data: number[] } | null> => {
    try {
        const ai = getClient();
        
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Create a simple 1-bit pixel art bitmap of a "${prompt}" suitable for a ${width}x${height} LCD display. 
            The output must be a flat JSON array of integers (0 or 1) representing the pixels, row by row. 
            0 is off/background, 1 is on/foreground. 
            The array length must be exactly ${width * height}.
            Do not include any other text.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        data: {
                            type: Type.ARRAY,
                            items: { type: Type.INTEGER },
                            description: `Flat array of ${width * height} pixels (0 or 1).`
                        }
                    },
                    required: ["data"]
                }
            }
        });

        const text = response.text;
        if (!text) return null;
        
        const json = JSON.parse(text);
        if (json.data && Array.isArray(json.data) && json.data.length === width * height) {
            return json;
        }
        return null;
    } catch (error) {
        console.error("Gemini Generation Error:", error);
        return null;
    }
};

export const analyzeCodeExplanation = async (cCode: string): Promise<string> => {
    try {
        const ai = getClient();
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Explain how to use this C bitmap array in an Arduino sketch using the Adafruit GFX library. Keep it brief. \n\n${cCode}`,
        });
        return response.text || "No explanation generated.";
    } catch (error) {
        return "Could not generate explanation.";
    }
};