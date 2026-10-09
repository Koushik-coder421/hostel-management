import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import {
    getViewDashboard,
    getViewResidents,
    getViewResidentById,
    getViewRooms,
    getViewCheckIns,
    getViewCheckOuts,
    getViewPayments,
    getViewReports,
    getViewSettings,
    getViewHostels,
    getViewOrganizations,
    getViewManagers,
    getViewVisitors,
    getViewMaintenance,
    getViewExpenses,
    handleLogVisitor,
    handleCheckoutVisitor
} from "../controllers/views.controller";

const router = Router();

router.use(authenticateToken);

router.get("/dashboard", getViewDashboard);
router.get("/residents", getViewResidents);
router.get("/residents/:id", getViewResidentById);
router.get("/rooms", getViewRooms);
router.get("/check-ins", getViewCheckIns);
router.get("/check-outs", getViewCheckOuts);
router.get("/payments", getViewPayments);
router.get("/reports", getViewReports);
router.get("/settings", getViewSettings);
router.get("/hostels", getViewHostels);
router.get("/organizations", getViewOrganizations);
router.get("/managers", getViewManagers);
router.get("/visitors", getViewVisitors);
router.post("/visitors", handleLogVisitor);
router.post("/visitors/:id/checkout", handleCheckoutVisitor);
router.get("/maintenance", getViewMaintenance);
router.get("/expenses", getViewExpenses);

export default router;
