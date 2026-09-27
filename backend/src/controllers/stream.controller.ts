import { Request, Response, NextFunction } from "express";
import pool from "../config/database";
import { AppError } from "../middleware/errorHandler";

/**
 * Initialize camera_stream table if it doesn't exist and seed default demo streams
 */
async function ensureStreamTableExists() {
    const connection = await pool.getConnection();
    try {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS camera_stream (
                stream_id INT AUTO_INCREMENT PRIMARY KEY,
                hostel_id INT NOT NULL,
                camera_name VARCHAR(100) NOT NULL,
                location_tag VARCHAR(100) NOT NULL,
                stream_url VARCHAR(500) NOT NULL,
                stream_type ENUM('HLS', 'RTSP', 'MP4', 'WEBRTC') DEFAULT 'HLS',
                status ENUM('ONLINE', 'OFFLINE', 'MAINTENANCE') DEFAULT 'ONLINE',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (hostel_id) REFERENCES hostel(hostel_id) ON DELETE CASCADE
            )
        `);

        // Check if streams exist
        const [existing] = await connection.query<any[]>("SELECT COUNT(*) as count FROM camera_stream");
        if (existing[0].count === 0) {
            // Get available hostels
            const [hostels] = await connection.query<any[]>("SELECT hostel_id, name FROM hostel LIMIT 5");
            if (hostels.length > 0) {
                const sampleStreams = [
                    {
                        camera_name: "Cam 01 - Main Entrance",
                        location_tag: "Entrance / Reception",
                        stream_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                        stream_type: "MP4",
                        status: "ONLINE"
                    },
                    {
                        camera_name: "Cam 02 - Dining Hall",
                        location_tag: "Dining & Mess Area",
                        stream_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
                        stream_type: "MP4",
                        status: "ONLINE"
                    },
                    {
                        camera_name: "Cam 03 - 1st Floor Corridor",
                        location_tag: "Block A - Floor 1",
                        stream_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                        stream_type: "MP4",
                        status: "ONLINE"
                    },
                    {
                        camera_name: "Cam 04 - Parking & Gate 2",
                        location_tag: "Outer Perimeter",
                        stream_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
                        stream_type: "MP4",
                        status: "ONLINE"
                    }
                ];

                for (const hostel of hostels) {
                    for (const s of sampleStreams) {
                        await connection.query(
                            `INSERT INTO camera_stream (hostel_id, camera_name, location_tag, stream_url, stream_type, status)
                             VALUES (?, ?, ?, ?, ?, ?)`,
                            [hostel.hostel_id, s.camera_name, s.location_tag, s.stream_url, s.stream_type, s.status]
                        );
                    }
                }
            }
        }
    } catch (err) {
        console.error("Error setting up camera_stream table:", err);
    } finally {
        connection.release();
    }
}

// Run table setup
ensureStreamTableExists();

/**
 * 1. Get Live Streams (Scoped by User Role & Hostel Access)
 */
export const getLiveStreams = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const currentUser = (req as any).user;
        const { hostel_id } = req.query;

        let query = `
            SELECT cs.stream_id, cs.hostel_id, h.name as hostel_name, cs.camera_name, cs.location_tag, cs.stream_url, cs.stream_type, cs.status, cs.created_at
            FROM camera_stream cs
            JOIN hostel h ON cs.hostel_id = h.hostel_id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (hostel_id) {
            query += " AND cs.hostel_id = ?";
            params.push(hostel_id);
        }

        // Role Scoping: MANAGER or SUPERVISOR or PARTNER
        if (currentUser.role === "PARTNER") {
            const [pRec] = await pool.query<any[]>(
                `SELECT p.partner_id FROM partner p JOIN person pe ON p.person_id = pe.person_id WHERE pe.email = ? OR pe.phone = ?`,
                [currentUser.email, currentUser.phone]
            );
            const partnerId = pRec[0]?.partner_id;
            if (partnerId) {
                query += " AND cs.hostel_id IN (SELECT hostel_id FROM partner_hostel_assignment WHERE partner_id = ? AND is_current = TRUE)";
                params.push(partnerId);
            }
        } else if (currentUser.role === "MANAGER") {
            const [mRec] = await pool.query<any[]>(
                `SELECT m.manager_id FROM manager m JOIN person pe ON m.person_id = pe.person_id WHERE pe.email = ? OR pe.phone = ?`,
                [currentUser.email, currentUser.phone]
            );
            const managerId = mRec[0]?.manager_id;
            if (managerId) {
                query += " AND cs.hostel_id IN (SELECT hostel_id FROM manager_hostel_assignment WHERE manager_id = ? AND is_current = TRUE)";
                params.push(managerId);
            }
        } else if (currentUser.role === "SUPERVISOR") {
            const [sRec] = await pool.query<any[]>(
                `SELECT s.supervisor_id FROM supervisor s JOIN person pe ON s.person_id = pe.person_id WHERE pe.email = ? OR pe.phone = ?`,
                [currentUser.email, currentUser.phone]
            );
            const supervisorId = sRec[0]?.supervisor_id;
            if (supervisorId) {
                query += " AND cs.hostel_id IN (SELECT hostel_id FROM hostel_supervisor_assignment WHERE supervisor_id = ? AND is_current = TRUE)";
                params.push(supervisorId);
            }
        }

        query += " ORDER BY cs.stream_id ASC";

        const [rows] = await pool.query<any[]>(query, params);

        res.json({
            status: "success",
            results: rows.length,
            data: rows
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 2. Get Single Camera Stream Details
 */
export const getStreamById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const streamId = Number(req.params.id);

        const [rows] = await pool.query<any[]>(
            `SELECT cs.stream_id, cs.hostel_id, h.name as hostel_name, cs.camera_name, cs.location_tag, cs.stream_url, cs.stream_type, cs.status, cs.created_at
             FROM camera_stream cs
             JOIN hostel h ON cs.hostel_id = h.hostel_id
             WHERE cs.stream_id = ?`,
            [streamId]
        );

        if (rows.length === 0) {
            return next(new AppError("Camera stream not found", 404));
        }

        res.json({
            status: "success",
            data: rows[0]
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 3. Add New Live Camera Stream
 */
export const addLiveStream = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { hostel_id, camera_name, location_tag, stream_url, stream_type } = req.body;

        if (!hostel_id || !camera_name || !location_tag || !stream_url) {
            return next(new AppError("hostel_id, camera_name, location_tag, and stream_url are required", 400));
        }

        const [hostel] = await pool.query<any[]>("SELECT hostel_id FROM hostel WHERE hostel_id = ?", [hostel_id]);
        if (hostel.length === 0) {
            return next(new AppError("Hostel not found", 404));
        }

        const [result] = await pool.query<any>(
            `INSERT INTO camera_stream (hostel_id, camera_name, location_tag, stream_url, stream_type, status)
             VALUES (?, ?, ?, ?, ?, 'ONLINE')`,
            [hostel_id, camera_name, location_tag, stream_url, stream_type || "HLS"]
        );

        res.status(201).json({
            status: "success",
            message: "Camera stream added successfully",
            data: {
                stream_id: result.insertId,
                hostel_id,
                camera_name,
                location_tag,
                stream_url,
                stream_type: stream_type || "HLS",
                status: "ONLINE"
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 4. Update Stream Status (ONLINE, OFFLINE, MAINTENANCE)
 */
export const updateStreamStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const streamId = Number(req.params.id);
        const { status, camera_name, location_tag, stream_url } = req.body;

        const [existing] = await pool.query<any[]>("SELECT stream_id FROM camera_stream WHERE stream_id = ?", [streamId]);
        if (existing.length === 0) {
            return next(new AppError("Camera stream not found", 404));
        }

        await pool.query(
            `UPDATE camera_stream
             SET status = COALESCE(?, status),
                 camera_name = COALESCE(?, camera_name),
                 location_tag = COALESCE(?, location_tag),
                 stream_url = COALESCE(?, stream_url)
             WHERE stream_id = ?`,
            [status, camera_name, location_tag, stream_url, streamId]
        );

        res.json({
            status: "success",
            message: "Camera stream updated successfully"
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 5. Delete Camera Stream
 */
export const deleteStream = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const streamId = Number(req.params.id);

        const [existing] = await pool.query<any[]>("SELECT stream_id FROM camera_stream WHERE stream_id = ?", [streamId]);
        if (existing.length === 0) {
            return next(new AppError("Camera stream not found", 404));
        }

        await pool.query("DELETE FROM camera_stream WHERE stream_id = ?", [streamId]);

        res.json({
            status: "success",
            message: "Camera stream removed successfully"
        });
    } catch (error) {
        next(error);
    }
};
