import { Router } from "express";
import {
    getAllAllocations,
    allocateBed,
    checkoutTenant,
    transferBed
} from "../controllers/allocation.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

router.get("/", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN", "SUPERVISOR"), getAllAllocations);
router.post("/", authorizeRoles("HEAD", "MANAGER", "ADMIN", "SUPERVISOR"), allocateBed);
router.post("/transfer", authorizeRoles("HEAD", "MANAGER", "ADMIN", "SUPERVISOR"), transferBed);
router.post("/:id/transfer", authorizeRoles("HEAD", "MANAGER", "ADMIN", "SUPERVISOR"), transferBed);
router.post("/:id/checkout", authorizeRoles("HEAD", "MANAGER", "ADMIN", "SUPERVISOR"), checkoutTenant);

export default router;
