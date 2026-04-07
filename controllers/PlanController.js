import Razorpay from "razorpay";
import crypto from "crypto";
import Plan from "../models/Plan.js";
import sendEmail from "./EmailController.js";
import User from "../models/User.js";
import { configDotenv } from "dotenv";
configDotenv();
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

const createOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    if (!order)
      return res.status(500).send("Some error occurred while creating order.");

    console.log("Order ID:", order.id);
    console.log("Amount:", order.amount);
    console.log("Currency:", order.currency);

    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).send(error.message);
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;
    const { userId } = req.user;

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature === razorpay_signature) {
      const startDate = new Date();
      const endDate = new Date(startDate);

      endDate.setDate(startDate.getDate() + 30);

      const user = User.findById(userId);

      await Plan.findOneAndUpdate(
        { userId },
        {
          plan: "Premium Plan",
          duration: 30,
          price: 1000,
          startDate,
          endDate,
        },
        { new: true }
      );
      sendEmail(
        process.env.toAdmin,
        user.email,
        "Payment for Nutri app",
        "There is new Subscription for Nutri app"
      );
      res.status(200).json({ message: "Payment successful and plan updated!" });
    }
  } catch (error) {
    res.status(400).json({ message: "Invalid payment signature" });
  }
};

export { createOrder, verifyPayment };
