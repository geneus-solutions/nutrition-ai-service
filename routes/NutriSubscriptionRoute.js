import express from "express";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

import {NutriSubscriptionCheckOut} from "../controllers/NutiSubscriptionController.js";
import { Auth } from "../controllers/AuthController.js";

router.post("/nutri-checkout",Auth,NutriSubscriptionCheckOut);

export default router;