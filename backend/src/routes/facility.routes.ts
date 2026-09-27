import { Router } from "express";
import {
    getAllFacilities,
    createFacility,
    updateFacility,
    deleteFacility,
    getHostelFacilities,
    assignFacilityToHostel,
    updateHostelFacilityAssignment
} from "../controllers/facility.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

router.get("/", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN", "SUPERVISOR"), getAllFacilities);
router.post("/", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN"), createFacility);
router.put("/:id", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN"), updateFacility);
router.delete("/:id", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN"), deleteFacility);

router.get("/hostel/:hostel_id", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN", "SUPERVISOR"), getHostelFacilities);
router.post("/assign", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN"), assignFacilityToHostel);
router.patch("/assignment/:id", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN"), updateHostelFacilityAssignment);

export default router;
