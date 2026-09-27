import { Request } from "express";

export interface AuthUser {
    staff_id: number;
    name: string;
    email: string;
    role: "HEAD" | "PARTNER" | "MANAGER" | "ADMIN" | "SUPERVISOR" | "MAINTENANCE_STAFF";
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}
