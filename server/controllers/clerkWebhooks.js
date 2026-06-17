import User from "../models/User.js";
import { Webhook } from "svix"; 

const clerkWebhooks = async (req, res) =>{
    console.log("WEBHOOK HIT");
    try{
        //Create a Svix instance with clerk webhook secret
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET)

        //Getting Headers
        const headers = {
            "svix-id": req.headers["svix-id"],
            "svix-timestamp": req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"],
        };

        //Verifying Headers
        await whook.verify(JSON.stringify(req.body), headers)

        //Getting data from request body
        const{data, type} =req.body
        console.log("TYPE:", type);
        console.log("DATA:", JSON.stringify(data, null, 2));
        
        

       

        //Switch cases for different events
        switch (type) {
            case "user.created":{
                const userData = {
        _id: data.id,
        email: data.email_addresses[0].email_address,
        username: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
         image: data.image_url || "",
        }
        
        
                await User.create(userData);
                break;
            }

            case "user.updated":{
                const userData = {
        _id: data.id,
        email: data.email_addresses?.[0]?.email_address || "",
        username: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
         image: data.image_url || "",
        }
                await User.findByIdAndUpdate(data.id, userData);
                break;
            }

            case "user.deleted":{
                await User.findByIdAndDelete(data.id);
                break;
            }

            default:
                break;

        }
        res.json({success: true, message: "Webhook Receive"})

    }catch (error) {
        console.error(error);
        res.json({success: false, message: error.message});
    } 

}

export default clerkWebhooks;