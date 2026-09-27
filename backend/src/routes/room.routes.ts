import { Router } from "express";
import {
    getAllRooms,
    getRoomById,
    createRoom,
    updateRoom,
    deleteRoom
} from "../controllers/room.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth";

const router = Router();

router.get("/", getAllRooms);
router.get("/:id", getRoomById);

router.post("/", authenticateToken, authorizeRoles("HEAD", "ADMIN", "MANAGER", "SUPERVISOR"), createRoom);
router.put("/:id", authenticateToken, authorizeRoles("HEAD", "ADMIN", "MANAGER", "SUPERVISOR"), updateRoom);
router.delete("/:id", authenticateToken, authorizeRoles("HEAD", "ADMIN"), deleteRoom);

export default router;
