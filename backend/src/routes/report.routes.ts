import { Router } from "express";
import {
    getDashboardSummary,
    getOccupancyReport,
    getRevenueReport,
    getMaintenanceReport
} from "../controllers/report.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

router.get("/dashboard", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN", "SUPERVISOR"), getDashboardSummary);
router.get("/occupancy", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN", "SUPERVISOR"), getOccupancyReport);
router.get("/revenue", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN"), getRevenueReport);
router.get("/maintenance", authorizeRoles("HEAD", "MANAGER", "ADMIN", "SUPERVISOR"), getMaintenanceReport);

export default router;
