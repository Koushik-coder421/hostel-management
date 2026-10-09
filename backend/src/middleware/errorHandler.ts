import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
    public statusCode: number;
    public status: string;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
        Error.captureStackTrace(this, this.constructor);
    }
}

interface CustomError {
    statusCode?: number;
    status?: string;
    message?: string;
    code?: string;
    errno?: number;
    sqlMessage?: string;
    stack?: string;
}

export const errorHandler = (
    err: unknown,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction
) => {
    const errorObj: CustomError =
        typeof err === "object" && err !== null ? (err as CustomError) : {};

    let statusCode = errorObj.statusCode || 500;
    let status = errorObj.status || (statusCode >= 400 && statusCode < 500 ? "fail" : "error");
    let message = errorObj.message || "Internal Server Error";

    // Handle MySQL Duplicate Entry (ER_DUP_ENTRY / 1062)
    if (errorObj.code === "ER_DUP_ENTRY" || errorObj.errno === 1062) {
        statusCode = 400;
        status = "fail";
        const sqlMsg = errorObj.sqlMessage || message;
        const match = sqlMsg.match(/Duplicate entry '(.*?)' for key/);
        if (match && match[1]) {
            message = `Duplicate entry '${match[1]}': A record with this detail already exists.`;
        } else {
            message = "A record with this detail already exists.";
        }
    }

    console.error(`[API Error] ${req.method} ${req.originalUrl} - ${statusCode}:`, {
        message,
        code: errorObj.code,
        stack: process.env.NODE_ENV === "development" ? errorObj.stack : undefined
    });

    res.status(statusCode).json({
        status,
        message,
        ...(process.env.NODE_ENV === "development" && { stack: errorObj.stack })
    });
};

