import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });


export const getGeminiVisionAndNutrition = async (imageBase64) => {
  const prompt = `
Analyze this image and identify distinct food items. Provide accurate nutritional data per 100g for each item. Be extremely concise to minimize output tokens.

For each item:
1. Identify the specific dish name or food variety.
2. Visually estimate the total COMBINED edible weight in grams for all visible pieces of this item (e.g., if there are 5 bananas, estimate the weight of all 5 combined). Your estimation must be highly accurate, within a +/- 15 gram margin of error. Provide this as "estimatedWeightGrams".
3. Provide a very short "summary" (max 3 words) and "description" (max 5 words).
4. Provide accurate nutritional values for 100g of the food: calories, protein, carbs, fat, and max 3 key ingredients.

Return ONLY valid JSON:
{
  "items": [
    {
      "name": "Specific Food Name",
      "estimatedWeightGrams": number,
      "summary": "Max 3 words",
      "description": "Max 5 words",
      "nutrition": {
        "calories": number,
        "protein": number,
        "carbs": number,
        "fat": number,
        "ingredients": ["Ingred 1", "Ingred 2", "Ingred 3"],
        "description": "Max 5 words"
      }
    }
  ],
  "summary": "Overall summary, max 5 words"
}

If the image contains no food, return:
{ "isFood": false }
`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: imageBase64,
        mimeType: "image/jpeg"
      }
    }
  ]);

  const text = cleanJson(result.response.text());
  const data = JSON.parse(text);

  if (data.isFood === false) return null;

  return data;
};

// Fallback: Get nutrition data for a single food item (used only when nutrition is missing from vision result)
export const getGeminiNutrition = async (foodName) => {
  const prompt = `
Provide nutritional information for 100g of "${foodName}". Be extremely concise.
Return ONLY valid JSON:

{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "servingSize": "100g",
  "ingredients": ["ing 1","ing 2","ing 3"],
  "description": "Max 5 words"
}
`;

  const result = await model.generateContent(prompt);
  const text = cleanJson(result.response.text());

  return JSON.parse(text);
};

// Clean Gemini JSON responses
const cleanJson = (text) => {
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
};