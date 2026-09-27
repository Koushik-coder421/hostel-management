import { Router } from "express";
import {
    getAllHostels,
    getHostelById,
    createHostel,
    updateHostel,
    deleteHostel
} from "../controllers/hostel.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth";

const router = Router();

router.get("/", getAllHostels);
router.get("/:id", getHostelById);

router.post("/", authenticateToken, authorizeRoles("SUPERADMIN", "HEAD", "ADMIN"), createHostel);
router.put("/:id", authenticateToken, authorizeRoles("SUPERADMIN", "HEAD", "ADMIN", "MANAGER"), updateHostel);
router.delete("/:id", authenticateToken, authorizeRoles("SUPERADMIN", "HEAD", "ADMIN"), deleteHostel);

export default router;