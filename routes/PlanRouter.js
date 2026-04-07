import express from 'express';
import { createOrder, verifyPayment } from '../controllers/PlanController.js';
import { Auth } from '../controllers/AuthController.js';

const router = express.Router();

router.post('/api/plan/create-order', Auth, createOrder);
router.post('/api/plan/verify-payment',Auth, verifyPayment);

export default router;
