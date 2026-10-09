import { Router } from "express";
import {
    createHead,
    createPartner,
    createManager,
    createSupervisor,
    getRoleDashboard,
    listPartners,
    listManagers,
    listHeads,
    listSupervisors,
    listAssignments,
    assignHeadPartner,
    assignPartnerManager,
    assignPartnerHostel,
    assignManagerHostel,
    assignSupervisorHostel,
    updateHierarchyStaff,
    elevateHierarchyStaffRole,
    getHierarchyStaffHistory,
    getResidentStayDetails
} from "../controllers/hierarchy.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

// Resident stay details route
router.get("/me/stay", getResidentStayDetails);

// Creation routes
router.post("/head", authorizeRoles("SUPERADMIN", "ADMIN"), createHead);
router.post("/partner", authorizeRoles("SUPERADMIN", "ADMIN", "HEAD"), createPartner);
router.post("/manager", authorizeRoles("SUPERADMIN", "ADMIN", "HEAD", "PARTNER"), createManager);
router.post("/supervisor", authorizeRoles("SUPERADMIN", "ADMIN", "HEAD", "PARTNER", "MANAGER"), createSupervisor);

// Staff Profile & Status Edit, Elevation & History
router.put("/staff/:id", authorizeRoles("SUPERADMIN", "ADMIN", "HEAD", "PARTNER", "MANAGER"), updateHierarchyStaff);
router.post("/staff/:id/elevate", authorizeRoles("SUPERADMIN", "ADMIN", "HEAD", "PARTNER"), elevateHierarchyStaffRole);
router.get("/staff/:id/history", authorizeRoles("SUPERADMIN", "ADMIN", "HEAD", "PARTNER", "MANAGER", "SUPERVISOR"), getHierarchyStaffHistory);

// Dashboard data route
router.get("/dashboard", authorizeRoles("SUPERADMIN", "ADMIN", "HEAD", "PARTNER", "MANAGER", "SUPERVISOR"), getRoleDashboard);

// Helper listing routes
router.get("/heads", authorizeRoles("SUPERADMIN", "ADMIN"), listHeads);
router.get("/partners", authorizeRoles("SUPERADMIN", "ADMIN", "HEAD", "PARTNER"), listPartners);
router.get("/managers", authorizeRoles("SUPERADMIN", "ADMIN", "HEAD", "PARTNER", "MANAGER"), listManagers);
router.get("/supervisors", authorizeRoles("SUPERADMIN", "ADMIN", "HEAD", "PARTNER", "MANAGER"), listSupervisors);
router.get("/assignments", authorizeRoles("SUPERADMIN", "ADMIN", "HEAD", "PARTNER", "MANAGER"), listAssignments);

// Standalone Assignment routes
router.post("/assign/head-partner", authorizeRoles("SUPERADMIN", "ADMIN"), assignHeadPartner);
router.post("/assign/partner-manager", authorizeRoles("SUPERADMIN", "ADMIN", "HEAD"), assignPartnerManager);
router.post("/assign/partner-hostel", authorizeRoles("SUPERADMIN", "ADMIN", "HEAD"), assignPartnerHostel);
router.post("/assign/manager-hostel", authorizeRoles("SUPERADMIN", "ADMIN", "HEAD", "PARTNER"), assignManagerHostel);
router.post("/assign/supervisor-hostel", authorizeRoles("SUPERADMIN", "ADMIN", "HEAD", "PARTNER", "MANAGER"), assignSupervisorHostel);

export default router;
