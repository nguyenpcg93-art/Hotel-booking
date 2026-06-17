import transporter from "../configs/notemailer.js";
import Booking from "../models/Booking.js";
import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";
import stripe from "stripe";


//Func hceck Available room
const checkAvailability = async ({checkInDate, checkOutDate, room})=>{
     console.log("BOOK API HIT");
    try {
        const bookings = await Booking.find({
            room,
            checkInDate: {$lte: checkOutDate},
            checkOutDate: {$lte: checkInDate}
        });
        const isAvailable = bookings.length == 0;
        return isAvailable;
    } catch (error) {
        console.error(error.message);
    }
}

//API to check available room
//POST /api/booking/check-availability
export const checkAvailabilityAPI = async (req, res)=>{
    try {
        const {room, checkInDate, checkOutDate}= req.body;
        const isAvailable = await checkAvailability({checkInDate, checkOutDate, room});
        res.json({success: true, isAvailable})
    } catch (error) {
        res.json({success: false, message: error,message})
    }
}

//API to create new booking
//POST /api/bookings.book

export const createBooking = async (req, res)=>{
    try {
        const {room, checkInDate, checkOutDate, guests} = req.body;
        const user = req.user._id;

        //before booking check available
        const isAvailable = await checkAvailability({
            checkInDate,
            checkOutDate,
            room
        });

        if(!isAvailable){
            return res.json({success: false, message: "Room is not available"})
        }
        //Get totalPrice from Room
        const roomData = await Room.findById(room).populate("hotel");
        let totalPrice = roomData.pricePerNight;

        //Caculate totalPrice base on Nights
        const checkIn = new Date(checkInDate)
        const checkOut = new Date(checkOutDate)
        const timeDiff = checkOut.getTime() - checkIn.getTime();
        const nights = Math.ceil(timeDiff / (1000 * 3600 *24));

        totalPrice *= nights;
        const booking = await Booking.create({
            user,
            room,
            hotel: roomData.hotel._id,
            guests: +guests,
            checkInDate,
            checkOutDate,
            totalPrice
        })

        const mailOptions = {
            from:process.env.SENDER_EMAIL,
            to: req.user.email,
            subject: 'Hotel Booking Details',
            html: `
               <h2>Your Booking Details</h2>
               <p>Dear ${req.user.username},</p>
               <p>Thanks you for your boooking! Here are your details:</p>
               <ul>
                  <li><strong>Booking ID:</strong> ${booking._id}</li>
                  <li><strong>Hotel Name:</strong> ${roomData.hotel.name}</li>
                  <li><strong>Location:</strong> ${roomData.hotel.address}</li>
                  <li><strong>Date</strong> ${booking.checkInDate.toDateString()}</li>
                  <li><strong>Booking Amont:</strong> ${process.env.CURRENCY || '$'} ${booking.totalPrice} /night</li>
               </ul>
               <p>We look forward to welcoming you!</p>
               <p>If you need to make any changes, feel free to contract us.</p>
            
            `

        }
        await transporter.sendMail(mailOptions);
        return res.json({
        success: true,
        message: "Booking created successfully"
});
    } catch (error) {
        console.log(error);
        res.json({success: false, message: "Failed to create booking"})
    }
};

//API to get all bookings for user
//GET /api/bookings/user
export const getUserBookings = async (req, res)=>{
    try{
        const user = req.user._id;
        const bookings = await Booking.find({user}).populate("room hotel").sort({createdAt: -1})
        console.log("BOOKINGS:", bookings);
        res.json({success: true, bookings})
    } catch(error){
        res.json({success: false, message: "Failed to fetch bookings"});
    }
}

export const getHotelBookings = async(req, res)=>{
    try {
        const hotel = await Hotel.findOne({owner: req.auth.userId});
        if(!hotel){
        return res.json({success: false, message: "No Hotel Found"});
        }
        const bookings = (await Booking.find({hotel: hotel._id}).populate("room hotel user")).toSorted({createdAt: -1});
        //Total Bookings
        const totalBookings = bookings.length;
        //Total Revenue
        const totalRevenue = bookings.reduce((acc, booking)=> acc + booking.totalPrice, 0)

        res.json({success: true, dashboardData: {totalBookings, totalRevenue, bookings}})
    } catch (error) {
        res.json({success: false, message: "Failed to fetch bookings"})
    }
}

export const stripePayment = async (req,res)=>{
    console.log("====== STRIPE PAYMENT HIT ======");
    try{
        console.log("BODY:", req.body);
        const {bookingId} =req.body;

        const booking = await Booking.findById(bookingId);
        const roomData = await Room.findById(booking.room).populate('hotel');
        const totalPrice=booking.totalPrice;

        const {origin} = req.headers;
        const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
        const line_items = [
            {
                price_data:{
                    currency:"usd",
                    product_data:{
                        name:roomData.hotel.name,
                    },
                    unit_amount:totalPrice * 100
                },
                quantity: 1
            }
        ]
        // Create Checkout Session
        const session = await stripeInstance.checkout.sessions.create({
            line_items,
            mode:"payment",
            success_url:`${origin}/my-bookings`,
            cancel_url:`${origin}/my-bookings`,
            metadata:{
                bookingId,
            }
        })
        res.json({success:true,url:session.url})


    }catch(error){
        res.json({success:false,message: "payment Failed"})

    }

}