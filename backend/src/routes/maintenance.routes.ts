import { Router } from "express";
import {
    getAllComplaints,
    createComplaint,
    updateComplaintStatus,
    getAllRequests,
    convertComplaintToRequest,
    addMaintenanceUpdate,
    getRequestHistory
} from "../controllers/maintenance.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

// Complaints
router.get("/complaints", getAllComplaints);
router.post("/complaints", createComplaint);
router.patch("/complaints/:id/status", authorizeRoles("ADMIN", "SUPERVISOR"), updateComplaintStatus);

// Requests
router.get("/requests", getAllRequests);
router.post("/requests/convert", authorizeRoles("ADMIN", "SUPERVISOR"), convertComplaintToRequest);
router.post("/requests/:id/updates", authorizeRoles("ADMIN", "SUPERVISOR", "MAINTENANCE_STAFF"), addMaintenanceUpdate);
router.get("/requests/:id/history", getRequestHistory);

export default router;
