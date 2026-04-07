import Plan from "../../models/Plan.js";
import User from "../../models/User.js";
import sendEmail from "../../controllers/EmailController.js";
import eventBus from "../../utilities/createEvent.js";

eventBus.on('subscribe_to_premiumNutri_plan', async(data) => {
    try {

        // Create a nodemailer transporter
        const {userId,amount, paymentId, orderId} = data;

        const currentDate = new Date();
        const orderStatus = "Geneus Solutions New Nutri Subscription Payment Recieved";
        const updatedOrderStatus = `${orderStatus} on ${currentDate.toLocaleDateString()} at ${currentDate.toLocaleTimeString()}`;

        const user = await User.findOne({_id: userId});

            //   update Subscription Plan for one month
            const userUpdatedPlan = await Plan.findOneAndUpdate(
              {userId},
              {
                  $set: {
                      plan: "Premium Plan",
                      duration:30,
                      paymentId,
                      price:amount,
                      startDate: new Date(),
                      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
                  }
              },
              {new: true}
            )

            await sendEmail(
                process.env.toAdmin,
                user.email,
                updatedOrderStatus,
                `Dear user\n\nThank you for Enrolling the course. We have received the request.\n\nrazorpay_order_id: ${orderId}\nrazorpay_payment_id: ${paymentId}\nuser_id: ${userId}. \n\nTo start learning goto https://www.geneussolutions.in/ and click on My Learning on the top right page. Thank you \n\nFor any queries, kindly reach out to us on support@geneussolutions.in. Happy Learning!\n\nThank you and Warm Regards,\nGeneus Solutions\n+91 9148950239`
            );

    } catch (error) {
        console.log('Error in event handler:', error);
    }
    
});