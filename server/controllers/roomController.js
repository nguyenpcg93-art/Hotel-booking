import { v2 as cloudinary } from "cloudinary";
import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";

// API to create a new room for hotel
export const createRoom = async (req, res) => {
    try {
        const { roomType, pricePerNight, amenities } = req.body;

        console.log("USER:", req.user);

        const hotel = await Hotel.findOne({
            owner: req.user._id,
        });

        console.log("HOTEL:", hotel);

        if (!hotel) {
            return res.json({
                success: false,
                message: "No Hotel found",
            });
        }

        // Upload images to Cloudinary
        const uploadImages = req.files.map(async (file) => {
            const response = await cloudinary.uploader.upload(file.path);
            return response.secure_url;
        });

        // Wait for all uploads
        const images = await Promise.all(uploadImages);

        await Room.create({
            hotel: hotel._id,
            roomType,
            pricePerNight: Number(pricePerNight),
            amenities: JSON.parse(amenities),
            images,
        });

        res.json({
            success: true,
            message: "Room Added Successfully",
        });
    } catch (error) {
        console.log(error);

        res.json({
            success: false,
            message: error.message,
        });
    }
};

// API to get all rooms
export const getRooms = async (req, res) => {
    try {
        const rooms = await Room.find({
            isAvailable: true,
        })
            .populate({
                path: "hotel",
                populate: {
                    path: "owner",
                    select: "image",
                },
            })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            rooms,
        });
    } catch (error) {
        res.json({
            success: false,
            message: error.message,
        });
    }
};

// API to get all rooms of hotel owner
export const getOwnerRooms = async (req, res) => {
    try {
        const hotelData = await Hotel.findOne({
            owner: req.user._id,
        });

        if (!hotelData) {
            return res.json({
                success: false,
                message: "No Hotel found",
            });
        }

        const rooms = await Room.find({
            hotel: hotelData._id,
        }).populate("hotel");

        res.json({
            success: true,
            rooms,
        });
    } catch (error) {
        res.json({
            success: false,
            message: error.message,
        });
    }
};

// API to toggle room availability
export const toggleRoomAvailability = async (req, res) => {
    try {
        const { roomId } = req.body;

        const roomData = await Room.findById(roomId);

        if (!roomData) {
            return res.json({
                success: false,
                message: "Room not found",
            });
        }

        roomData.isAvailable = !roomData.isAvailable;

        await roomData.save();

        res.json({
            success: true,
            message: "Room Availability Updated",
        });
    } catch (error) {
        res.json({
            success: false,
            message: error.message,
        });
    }
};