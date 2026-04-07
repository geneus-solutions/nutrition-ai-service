import Item from "../../models/FoodItems.js";
import { getGeminiNutrition } from "../../utilities/gemini.js";

export const findOrCreateFood = async (foodName) => {

  // 1️⃣ Search in DB
  let foodItem = await Item.findOne({
    name: { $regex: `^${foodName}$`, $options: "i" } // case insensitive
  });

  if (foodItem) {
    return foodItem._id;
  }

  // 2️⃣ Not found → call Gemini
  const nutrition = await getGeminiNutrition(foodName);

  // 3️⃣ Save into DB
  foodItem = await Item.create({
    name: foodName.toLowerCase(),
    calories: nutrition.calories,
    protein: nutrition.protein,
    carbs: nutrition.carbs,
    fat: nutrition.fat,
    servingSize: nutrition.servingSize,
    ingredients: nutrition.ingredients,
    description: nutrition.description
  });

  return foodItem._id;
};
