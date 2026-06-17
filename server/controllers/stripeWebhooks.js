import stripe from "stripe";
import Booking from "../models/Booking.js"

// ApI to handle Webhooks

export const stripeWebhooks = async (request,response)=>{
    console.log("===== STRIPE WEBHOOK HIT =====");
    //Strpe Gateway Initialize 
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
    const sig = request.headers['stripe-signature'];
    let event;
    try {
        event = stripeInstance.webhooks.constructEvent(request.body,sig,process.env.STRIPE_WEBHOOK_SECRET)
        console.log("EVENT:", event.type);
        
    } catch (error) {
        console.log("WEBHOOK ERROR:", error.message);
        return response.status(400).send(`Webhook Error: ${error.message}`)
        
    }
    if (event.type === "checkout.session.completed") {

    const session = event.data.object;

    console.log("CHECKOUT SESSION:", session);

    const bookingId = session.metadata.bookingId;

    console.log("BOOKING ID:", bookingId);

    await Booking.findByIdAndUpdate(
        bookingId,
        {
            isPaid: true,
            paymentMethod: "Stripe"
        }
    );

    console.log("BOOKING UPDATED");
}
else{
    console.log("Unhandled event type:", event.type);
}
    response.json({received:true});
}