import Razorpay from "razorpay";
import Plan from "../models/Plan.js";

import { configDotenv } from "dotenv";
configDotenv();

// emitter
import "../services/NutriAppService/subscribeToNutriApp.js";

const NutriSubscriptionCheckOut = async (req, res) => {
  try {
    const { userId } = req.user;
    const { currency } = req.body;

    const userPlan = await Plan.findOne({ userId });

    // console.log('this is plan', userPlan)

    if (!userPlan?._id) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    const currentDate = new Date();
    const endDate = new Date(userPlan.endDate);

    if (userPlan.plan === "Premium Plan" && currentDate < endDate) {
      return res.status(402).json({
        success: false,
        message: "You already have an active premium plan",
      });
    }

    const options = {
      amount: userPlan.price * 100 || 299 * 100,
      currency: currency,
      receipt: "receipt#1",
      payment_capture: 0,

      notes: {
        data: {
          userId: userId,
          amount: userPlan.price || 299,
        },
        event: "subscribe_to_premiumNutri_plan",
      },
    };

    const PaymentInstance = new Razorpay({
      key_id: process.env.RAZORPAY_ID,
      key_secret: process.env.RAZORPAY_SECRET,
    });

    const order = await PaymentInstance.orders.create(options);

    if (!order) {
      return res.status(500).json({
        message: "Something went wrong",
      });
    }

    return res
      .status(200)
      .send({
        success: true,
        Data: {
          orderId: order?.id,
          currency: order?.currency,
          amount: order?.amount,
        },
      });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export { NutriSubscriptionCheckOut };
