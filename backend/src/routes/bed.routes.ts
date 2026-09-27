import { Router } from "express";
import {
    getAllBeds,
    getAvailableBeds,
    createBed,
    updateBed,
    deleteBed
} from "../controllers/bed.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth";

const router = Router();

router.get("/", getAllBeds);
router.get("/available", getAvailableBeds);

router.post("/", authenticateToken, authorizeRoles("ADMIN", "SUPERVISOR"), createBed);
router.put("/:id", authenticateToken, authorizeRoles("ADMIN", "SUPERVISOR"), updateBed);
router.delete("/:id", authenticateToken, authorizeRoles("ADMIN"), deleteBed);

export default router;
