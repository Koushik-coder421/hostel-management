import { Router } from "express";
import {
    getLiveStreams,
    getStreamById,
    addLiveStream,
    updateStreamStatus,
    deleteStream
} from "../controllers/stream.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

router.get("/", authorizeRoles("SUPERADMIN", "ADMIN", "HEAD", "PARTNER", "MANAGER", "SUPERVISOR"), getLiveStreams);
router.get("/:id", authorizeRoles("SUPERADMIN", "ADMIN", "HEAD", "PARTNER", "MANAGER", "SUPERVISOR"), getStreamById);
router.post("/", authorizeRoles("SUPERADMIN", "ADMIN", "HEAD", "PARTNER", "MANAGER"), addLiveStream);
router.put("/:id", authorizeRoles("SUPERADMIN", "ADMIN", "HEAD", "PARTNER", "MANAGER"), updateStreamStatus);
router.delete("/:id", authorizeRoles("SUPERADMIN", "ADMIN", "HEAD", "PARTNER"), deleteStream);

export default router;
