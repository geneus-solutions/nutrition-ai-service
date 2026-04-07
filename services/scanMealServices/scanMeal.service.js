import ScannedMeal from "../../models/ScannedMeal.js";

export const findScannedMealByHash = (imageHash) => {
  return ScannedMeal.findOne({ imageHash }).populate("items");
};

export const createScannedMeal = (data) => {
  return ScannedMeal.create(data);
};