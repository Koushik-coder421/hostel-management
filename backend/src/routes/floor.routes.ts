import { Router } from "express";
import {
    getAllFloors,
    getFloorsByHostel,
    createFloor,
    updateFloor,
    deleteFloor
} from "../controllers/floor.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth";

const router = Router();

router.get("/", getAllFloors);
router.get("/hostel/:hostelId", getFloorsByHostel);

router.post("/", authenticateToken, authorizeRoles("HEAD", "ADMIN", "MANAGER", "SUPERVISOR"), createFloor);
router.put("/:id", authenticateToken, authorizeRoles("HEAD", "ADMIN", "MANAGER", "SUPERVISOR"), updateFloor);
router.delete("/:id", authenticateToken, authorizeRoles("HEAD", "ADMIN"), deleteFloor);

export default router;
