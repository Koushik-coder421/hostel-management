import { Router } from "express";
import authRoutes from "./auth.routes";
import staffRoutes from "./staff.routes";
import hostelRoutes from "./hostel.routes";
import floorRoutes from "./floor.routes";
import roomRoutes from "./room.routes";
import bedRoutes from "./bed.routes";
import facilityRoutes from "./facility.routes";
import tenantRoutes from "./tenant.routes";
import allocationRoutes from "./allocation.routes";
import paymentRoutes from "./payment.routes";
import visitorRoutes from "./visitor.routes";
import maintenanceRoutes from "./maintenance.routes";
import reportRoutes from "./report.routes";
import hierarchyRoutes from "./hierarchy.routes";
import streamRoutes from "./stream.routes";
import expenseRoutes from "./expense.routes";
import viewsRoutes from "./views.routes";

import { loginStaff, getProfile } from "../controllers/auth.controller";
import { authenticateToken } from "../middleware/auth";
import {
    handleSwitchHostel,
    handleCheckIn,
    handleCheckOut,
    handleSetBedStatus,
    handleRecordPayment
} from "../controllers/views.controller";

const router = Router();

router.use("/auth", authRoutes);
router.post("/session", loginStaff);
router.get("/session", authenticateToken, getProfile);
router.delete("/session", (req, res) => res.json({ status: "success", success: true, message: "Signed out", data: {} }));

// Views routes
router.use("/views", viewsRoutes);

// Command operations
router.post("/session/active-hostel", authenticateToken, handleSwitchHostel);
router.post("/admissions", authenticateToken, handleCheckIn);
router.post("/departures", authenticateToken, handleCheckOut);
router.post("/inventory/bed-status", authenticateToken, handleSetBedStatus);
router.post("/payments", authenticateToken, handleRecordPayment);

router.use("/staff", staffRoutes);
router.use("/hostels", hostelRoutes);
router.use("/floors", floorRoutes);
router.use("/rooms", roomRoutes);
router.use("/beds", bedRoutes);
router.use("/facilities", facilityRoutes);
router.use("/tenants", tenantRoutes);
router.use("/allocations", allocationRoutes);
router.use("/payments", paymentRoutes);
router.use("/expenses", expenseRoutes);
router.use("/visitors", visitorRoutes);
router.use("/maintenance", maintenanceRoutes);
router.use("/reports", reportRoutes);
router.use("/hierarchy", hierarchyRoutes);
router.use("/streams", streamRoutes);

export default router;
