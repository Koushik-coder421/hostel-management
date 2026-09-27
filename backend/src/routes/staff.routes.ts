import { Router } from "express";
import {
    getAllStaff,
    getStaffById,
    updateStaff,
    deleteStaff,
    assignStaffToHostel,
    provisionOrganizationHierarchy
} from "../controllers/staff.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

router.post("/hierarchy/provision", authorizeRoles("HEAD", "ADMIN"), provisionOrganizationHierarchy);
router.get("/", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN", "SUPERVISOR"), getAllStaff);
router.get("/:id", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN", "SUPERVISOR"), getStaffById);
router.put("/:id", authorizeRoles("HEAD", "ADMIN", "MANAGER"), updateStaff);
router.delete("/:id", authorizeRoles("HEAD", "ADMIN"), deleteStaff);
router.post("/assign-hostel", authorizeRoles("HEAD", "ADMIN", "MANAGER"), assignStaffToHostel);

export default router;
