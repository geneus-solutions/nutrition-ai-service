import crypto from "crypto";
import catchAsync from "../utilities/catchAsync.js";
import ApiError from "../utilities/ApiError.js";
import sharp from "sharp";

import {
  getGeminiVisionAndNutrition,
  getGeminiNutrition,
} from "../utilities/gemini.js";
import {
  createScannedMeal,
  findScannedMealByHash,
} from "../services/scanMealServices/scanMeal.service.js";
import {
  createFoodItem,
  findFoodByName,
} from "../services/foodItemServices/foodItem.service.js";

function hashImage(imageBase64) {
  return crypto.createHash("sha256").update(imageBase64).digest("hex");
}

const extractGrams = (servingString) => {
  if (!servingString) return 100;
  const match = String(servingString).match(/(\d+(?:\.\d+)?)\s*(?:g|grams)\b/i);
  if (match) return Number(match[1]);
  return 100;
};

export const scanFood = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Image is required");
  }

  // 1️ Compress and Convert image
  // Shrink the raw phone image to max 1024px and compress heavily to skip network/Gemini cold start delays
  const compressedBuffer = await sharp(req.file.buffer)
    .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer();

  const imageBase64 = compressedBuffer.toString("base64");

  // 2️ Hash image
  const imageHash = hashImage(imageBase64);

  // 3️ Cache check
  const cachedMeal =
    await findScannedMealByHash(imageHash).populate("items.foodId");
  if (cachedMeal) {
    const items = cachedMeal.items.map((item) => ({
      ...item.foodId.toObject(),
      quantity: item.quantity,
      totalCalories: item.foodId.calories * item.quantity,
    }));

    return res.status(200).json({
      success: true,
      source: "cache",
      summary: cachedMeal.summary,
      totalCalories: cachedMeal.totalCalories,
      items,
    });
  }

  // 4️ Single Gemini call: Vision + Nutrition combined
  const visionResult = await getGeminiVisionAndNutrition(imageBase64);

  if (!visionResult?.items?.length) {
    throw new ApiError(404, "No food detected");
  }

  // 5️ Parallel DB lookups for all detected food items
  const processedItems = await Promise.all(
    visionResult.items.map(async (foodItem) => {
      const { name, estimatedWeightGrams, description, summary, nutrition } = foodItem;

      let food = await findFoodByName(name);

      if (!food) {
        // Use nutrition from the combined Gemini response; fall back to a separate call only if missing
        const nutritionData = nutrition || (await getGeminiNutrition(name));

        food = await createFoodItem({
          name: name,
          calories: nutritionData?.calories || 0,
          protein: nutritionData?.protein || 0,
          carbs: nutritionData?.carbs || 0,
          fat: nutritionData?.fat || 0,
          servingSize: "100g",
          ingredients: nutritionData?.ingredients || [name],
          description: description || nutritionData?.description || `${name}`,
          createdBy: "scan",
          isVerified: false,
        });
      }

      const dbItemBaseGrams = extractGrams(food.servingSize);
      const quantity = (estimatedWeightGrams || 100) / dbItemBaseGrams;

      return {
        ...food.toObject(),
        description: description || food.description,
        summary: summary || "",
        quantity,
        totalCalories: food.calories * quantity,
      };
    })
  );

  // 6️ Calculate total calories
  const totalCalories = processedItems.reduce(
    (sum, item) => sum + (item.totalCalories || 0),
    0,
  );

  // 7️ Save scan cache
  const scannedMeal = await createScannedMeal({
    imageHash,
    items: processedItems.map((i) => ({
      foodId: i._id,
      quantity: i.quantity,
    })),
    summary: visionResult.summary,
    totalCalories,
  });

  // 8️ Response
  res.status(200).json({
    success: true,
    source: "ai",
    summary: scannedMeal.summary,
    totalCalories: scannedMeal.totalCalories,
    items: processedItems,
  });
});