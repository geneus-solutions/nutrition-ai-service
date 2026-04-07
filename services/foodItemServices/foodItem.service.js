import Item from "../../models/FoodItems.js";

export const findFoodByName = (name) => {
  return Item.findOne({ name: new RegExp(`^${name}$`, "i") });
};

export const createFoodItem = (data) => {
  return Item.create(data);
};
