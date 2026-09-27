import { Router } from "express";
import {
    getAllVisitors,
    createVisitor,
    getAllVisits,
    logVisit,
    checkOutVisit
} from "../controllers/visitor.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

router.get("/visitors", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN", "SUPERVISOR"), getAllVisitors);
router.post("/visitors", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN", "SUPERVISOR"), createVisitor);

router.get("/visits", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN", "SUPERVISOR"), getAllVisits);
router.post("/visits", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN", "SUPERVISOR"), logVisit);
router.patch("/visits/:id/checkout", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN", "SUPERVISOR"), checkOutVisit);

export default router;
