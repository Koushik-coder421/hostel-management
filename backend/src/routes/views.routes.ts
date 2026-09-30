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
    handleSwitchHostel,
    handleCheckIn,
    handleCheckOut,
    handleSetBedStatus,
    handleRecordPayment
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

export default router;
