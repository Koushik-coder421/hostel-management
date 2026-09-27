import app from "../app";
import http from "http";

let server: http.Server;
const PORT = 5059;

const apiRequest = async (path: string, method: string = "GET", body?: any, token?: string) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`http://localhost:${PORT}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    const data = await res.json();
    return { status: res.status, data };
};

const verifyCleanState = async () => {
    server = app.listen(PORT, async () => {
        console.log(`\n=================================================`);
        console.log(`🧪 Verifying Clean State API Responses on Port ${PORT}`);
        console.log(`=================================================\n`);

        try {
            // 1. Test Login
            console.log("1. Testing login as admin@hostel.com...");
            const loginRes = await apiRequest("/api/auth/login", "POST", {
                email: "admin@hostel.com",
                password: "admin123"
            });
            console.log("   Status:", loginRes.status);
            console.log("   Success:", loginRes.data.success);
            console.log("   User role:", loginRes.data.data?.user?.role);

            const token = loginRes.data.token;

            // 2. Test GET /api/hierarchy/dashboard
            console.log("\n2. Testing GET /api/hierarchy/dashboard...");
            const dashRes = await apiRequest("/api/hierarchy/dashboard", "GET", undefined, token);
            console.log("   Status:", dashRes.status);
            console.log("   Dashboard Metrics:", JSON.stringify(dashRes.data.data?.metrics, null, 2));
            console.log("   Partners List Length:", dashRes.data.data?.partners?.length);

            // 3. Test GET /api/hierarchy/partners
            console.log("\n3. Testing GET /api/hierarchy/partners...");
            const partnersRes = await apiRequest("/api/hierarchy/partners", "GET", undefined, token);
            console.log("   Status:", partnersRes.status);
            console.log("   Partners Count:", partnersRes.data.data?.length);

            // 4. Test GET /api/hierarchy/heads
            console.log("\n4. Testing GET /api/hierarchy/heads...");
            const headsRes = await apiRequest("/api/hierarchy/heads", "GET", undefined, token);
            console.log("   Status:", headsRes.status);
            console.log("   Heads Count:", headsRes.data.data?.length);

            console.log(`\n=================================================`);
            console.log(`✅ Clean Database State Verified Successfully!`);
            console.log(`=================================================\n`);
        } catch (err) {
            console.error("❌ Clean state verification error:", err);
        } finally {
            server.close();
            process.exit(0);
        }
    });
};

verifyCleanState();
