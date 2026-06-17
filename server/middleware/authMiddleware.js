import User from "../models/User.js";

export const protect = async (req, res, next) => {
    try {
        console.log("AUTH TYPE:", typeof req.auth);

        const authData = await req.auth();

        console.log("AUTH DATA:", authData);

        const { userId } = authData;

        console.log("USER ID:", userId);

        if (!userId) {
            return res.json({
                success: false,
                message: "Not authenticated"
            });
        }
        

        const user = await User.findById(userId);

        console.log("FOUND USER:", user);

        if (!user) {
            return res.json({
                success: false,
                message: "User not found in database"
            });
        }

        req.user = user;

        next();

    } catch (error) {
        console.log(error);

        return res.json({
            success: false,
            message: error.message
        });
    }
};