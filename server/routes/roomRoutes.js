import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

import {
  createRoom,
  getRooms,
  getOwnerRooms,
  toggleRoomAvailability,
} from "../controllers/roomController.js";

const roomRouter = express.Router();

// Create Room
roomRouter.post(
  "/",
  upload.array("images", 4),
  protect,
  createRoom
);

// Get All Available Rooms
roomRouter.get("/", getRooms);

// Get Rooms Of Current Hotel Owner
roomRouter.get("/owner", protect, getOwnerRooms);

// Toggle Room Availability
roomRouter.post(
  "/toggle-availability",
  protect,
  toggleRoomAvailability
);

export default roomRouter;