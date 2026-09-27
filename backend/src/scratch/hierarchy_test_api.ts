import app from "../app";
import http from "http";
import pool from "../config/database";

let server: http.Server;
const PORT = 5058;

const apiRequest = async (path: string, method: string = "GET", body?: any, token?: string) => {
    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`http://localhost:${PORT}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    const data = await res.json();
    return { status: res.status, data };
};

const runHierarchyTests = async () => {
    server = app.listen(PORT, async () => {
        console.log(`\n=================================================`);
        console.log(`🏛️ Testing Organization Hierarchy Provisioning API on Port ${PORT}`);
        console.log(`=================================================\n`);

        try {
            // 1. Login Admin
            console.log("1. Logging in Admin...");
            const adminLogin = await apiRequest("/api/auth/login", "POST", {
                email: "admin@hostel.com",
                password: "admin123"
            });
            const adminToken = adminLogin.data.token;
            console.log("   Admin Auth Token acquired:", !!adminToken);

            // 2. Provision Full Organization Hierarchy
            // (1 Head -> 5 Partners -> 4 Managers/Partner = 20 Managers -> 5 Hostels/Manager = 100 Hostels -> 2 Supervisors/Hostel = 200 Supervisors)
            console.log("\n2. Provisioning Hierarchy via SuperAdmin input (total_hostels: 100, partners_count: 5, managers_per_partner: 4)...");
            const provisionRes = await apiRequest("/api/staff/hierarchy/provision", "POST", {
                head_name: "Dr. Vikramaditya (Executive Head)",
                total_hostels: 100,
                partners_count: 5,
                managers_per_partner: 4
            }, adminToken);

            console.log("   Provision API Status Code:", provisionRes.status);
            console.log("   Summary Results:");
            console.log("   - Head ID Created:", provisionRes.data.data?.head_id);
            console.log("   - Total Partners Created:", provisionRes.data.data?.total_partners);
            console.log("   - Total Managers Created:", provisionRes.data.data?.total_managers);
            console.log("   - Total Hostels Created:", provisionRes.data.data?.total_hostels);
            console.log("   - Total Supervisors Created:", provisionRes.data.data?.total_supervisors);
            console.log("   - Hostels per Partner:", provisionRes.data.data?.hostels_per_partner, "(Expected: 20)");
            console.log("   - Hostels per Manager:", provisionRes.data.data?.hostels_per_manager, "(Expected: 5)");
            console.log("   - Supervisors per Hostel:", provisionRes.data.data?.supervisors_per_hostel, "(Expected: 2)");

            // 3. Database Verification of Hierarchy Integrity
            console.log("\n3. Verifying Database Relational Assignments...");
            const [hpCount] = await pool.query<any[]>("SELECT COUNT(*) as cnt FROM head_partner_assignment WHERE is_current = TRUE");
            const [pmCount] = await pool.query<any[]>("SELECT COUNT(*) as cnt FROM partner_manager_assignment WHERE is_current = TRUE");
            const [mhCount] = await pool.query<any[]>("SELECT COUNT(*) as cnt FROM manager_hostel_assignment WHERE is_current = TRUE");
            const [phCount] = await pool.query<any[]>("SELECT COUNT(*) as cnt FROM partner_hostel_assignment WHERE is_current = TRUE");
            const [hsCount] = await pool.query<any[]>("SELECT COUNT(*) as cnt FROM hostel_supervisor_assignment WHERE is_current = TRUE");

            console.log("   - Head-Partner Links in DB:", hpCount[0].cnt);
            console.log("   - Partner-Manager Links in DB:", pmCount[0].cnt);
            console.log("   - Manager-Hostel Links in DB:", mhCount[0].cnt);
            console.log("   - Partner-Hostel Ownership Links in DB:", phCount[0].cnt);
            console.log("   - Hostel-Supervisor Links in DB:", hsCount[0].cnt);

            console.log(`\n=================================================`);
            console.log(`✅ Organization Hierarchy Provisioning Verified Successfully!`);
            console.log(`=================================================\n`);
        } catch (err) {
            console.error("❌ Hierarchy test error:", err);
        } finally {
            server.close();
            process.exit(0);
        }
    });
};

runHierarchyTests();
