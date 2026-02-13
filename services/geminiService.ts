
import { GoogleGenAI, Type } from "@google/genai";

export async function extractInvoiceData(base64Image: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
          },
        },
        {
          text: `Extract structured data from this invoice. 
Focus on:
1. Vendor name (Company or Store)
2. Date of invoice (ISO format YYYY-MM-DD)
3. Due date (If not present, use Date + 30 days)
4. Currency (3-letter ISO code)
5. Line items (Each should have a description, quantity, and unit rate)
6. Suggested category (Utilities, Rent, Meals, Office Supplies, Software, etc.)
7. Tags (Short keyword descriptors based on content)

Return strictly valid JSON matching the schema.`
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          vendorName: { type: Type.STRING },
          date: { type: Type.STRING },
          dueDate: { type: Type.STRING },
          currency: { type: Type.STRING },
          category: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                rate: { type: Type.NUMBER }
              },
              required: ["description", "quantity", "rate"]
            }
          }
        },
        required: ["vendorName", "date", "dueDate", "currency", "items"]
      }
    }
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("OCR Failed: No readable content found. Please ensure the invoice is centered and legible.");
  }

  try {
    // Attempt to parse strictly formatted JSON from Gemini
    const parsed = JSON.parse(text);
    if (!parsed.vendorName || parsed.vendorName === "") {
        throw new Error("Could not identify the Vendor reliably.");
    }
    return parsed;
  } catch (error: any) {
    console.error("Gemini Parsing Error:", text);
    throw new Error("Analysis failed: The invoice layout was too complex to parse automatically. Manual entry is required.");
  }
}
