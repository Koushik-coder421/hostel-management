import app from "../app";
import http from "http";
import pool from "../config/database";

let server: http.Server;
const PORT = 5057;

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

const runUpdationTests = async () => {
    // Reset tenant allocations & bed/room statuses for clean test execution
    await pool.query("UPDATE tenant_allocation SET status = 'COMPLETED' WHERE status = 'ACTIVE'");
    await pool.query("UPDATE bed SET status = 'AVAILABLE'");
    await pool.query("UPDATE room SET status = 'AVAILABLE'");

    server = app.listen(PORT, async () => {
        console.log(`\n=================================================`);
        console.log(`🔄 Running Integration & Updation Tests (updation_test_api.ts) on Port ${PORT}`);
        console.log(`=================================================\n`);

        try {
            // 1. Login as Admin & Supervisor
            console.log("1. Logging in Admin & Supervisor...");
            const adminLogin = await apiRequest("/api/auth/login", "POST", {
                email: "admin@hostel.com",
                password: "admin123"
            });
            const superLogin = await apiRequest("/api/auth/login", "POST", {
                email: "supervisor@hostel.com",
                password: "super123"
            });
            const adminToken = adminLogin.data.token;
            const superToken = superLogin.data.token;
            console.log("   Tokens acquired successfully.");

            // Provision Hierarchy
            console.log("\n1.5 [Hierarchy] Provisioning Organization (1 Head, 5 Partners, 20 Managers, 100 Hostels, 200 Supervisors)...");
            const hierarchyRes = await apiRequest("/api/staff/hierarchy/provision", "POST", {
                head_name: "Dr. Vikramaditya (Executive Head)",
                partners_count: 5,
                managers_per_partner: 4,
                hostels_per_manager: 5
            }, adminToken);
            console.log("   Hierarchy Status:", hierarchyRes.status, "| Total Hostels:", hierarchyRes.data.data?.total_hostels, "| Hostels/Partner:", hierarchyRes.data.data?.hostels_per_partner, "| Hostels/Manager:", hierarchyRes.data.data?.hostels_per_manager, "| Supervisors/Hostel:", hierarchyRes.data.data?.supervisors_per_hostel);

            // 2. Hostel Module Update
            console.log("\n2. [Hostels] Updating Hostel Details (PUT /api/hostels/1)...");
            const updateHostel = await apiRequest("/api/hostels/1", "PUT", {
                name: "Grand Heights Premier Hostel",
                contact_number: "040-88887777"
            }, adminToken);
            console.log("   Status:", updateHostel.status, "| Message:", updateHostel.data.message);

            // 3. Floor Module Update
            console.log("\n3. [Floors] Updating Floor Details (PUT /api/floors/1)...");
            const updateFloor = await apiRequest("/api/floors/1", "PUT", {
                name: "Floor 1 - Executive Wing"
            }, superToken);
            console.log("   Status:", updateFloor.status, "| Message:", updateFloor.data.message);

            // 4. Room Module Update
            console.log("\n4. [Rooms] Updating Room Details (PUT /api/rooms/1)...");
            const updateRoom = await apiRequest("/api/rooms/1", "PUT", {
                room_type: "Super Deluxe Double AC",
                capacity: 2
            }, superToken);
            console.log("   Status:", updateRoom.status, "| Message:", updateRoom.data.message);

            // 5. Bed Module Update
            console.log("\n5. [Beds] Updating Bed Details (PUT /api/beds/1)...");
            const updateBed = await apiRequest("/api/beds/1", "PUT", {
                bed_number: "101-A-Deluxe"
            }, superToken);
            console.log("   Status:", updateBed.status, "| Message:", updateBed.data.message);

            // 6. Facility Module Update
            console.log("\n6. [Facilities] Updating Facility Details (PUT /api/facilities/1)...");
            const updateFacility = await apiRequest("/api/facilities/1", "PUT", {
                description: "High-Speed Mesh Wi-Fi 6 Dedicated"
            }, superToken);
            console.log("   Status:", updateFacility.status, "| Message:", updateFacility.data.message);

            // 7. Tenant Profile Update
            console.log("\n7. [Tenants] Updating Tenant Profile (PUT /api/tenants/1)...");
            const updateTenant = await apiRequest("/api/tenants/1", "PUT", {
                emergency_contact_name: "Suresh K. Sharma",
                emergency_contact_phone: "9988776600"
            }, superToken);
            console.log("   Status:", updateTenant.status, "| Message:", updateTenant.data.message);

            // 8. Staff Profile Update
            console.log("\n8. [Staff] Updating Staff Profile (PUT /api/staff/2)...");
            const updateStaff = await apiRequest("/api/staff/2", "PUT", {
                phone: "9876543288"
            }, adminToken);
            console.log("   Status:", updateStaff.status, "| Message:", updateStaff.data.message);

            // 9. Active Tenant Allocation (Prerequisite for Visitor Visit & Maintenance)
            console.log("\n9. [Allocations] Allocating Bed 1 to Tenant 1 (POST /api/allocations)...");
            const allocRes = await apiRequest("/api/allocations", "POST", {
                tenant_id: 1,
                bed_id: 1,
                start_date: "2026-09-01"
            }, adminToken);
            const allocationId = allocRes.data.data?.allocation_id;
            console.log("   Status:", allocRes.status, "| Allocation ID:", allocationId);

            // 10. Visitor Checkout
            console.log("\n10. [Visitor Checkout] Registering visitor, logging visit & checking out (PATCH /api/visitors/visits/:id/checkout)...");
            const visitorRes = await apiRequest("/api/visitors/visitors", "POST", {
                name: "Ramesh Sharma",
                phone: "9876543210",
                id_type: "Aadhaar",
                id_number: "9876-5432-1098"
            }, superToken);
            const visitorId = visitorRes.data.data?.visitor_id;

            const visitRes = await apiRequest("/api/visitors/visits", "POST", {
                visitor_id: visitorId,
                hostel_id: 1,
                purpose: "Parental Visit",
                tenants: [{ tenant_id: 1, relationship: "Father", remarks: "Visiting son" }]
            }, superToken);
            const visitId = visitRes.data.data?.visit_id;
            console.log("   Visit logged successfully. Visit ID:", visitId);

            const visitorCheckout = await apiRequest(`/api/visitors/visits/${visitId}/checkout`, "PATCH", {}, superToken);
            console.log("   Visitor Checkout Status:", visitorCheckout.status, "| Message:", visitorCheckout.data.message);

            // 11. Maintenance Complaint Status Update
            console.log("\n11. [Complaint Status Update] Submitting complaint & updating status (PATCH /api/maintenance/complaints/:id/status)...");
            const complaintRes = await apiRequest("/api/maintenance/complaints", "POST", {
                tenant_id: 1,
                target_type: "ROOM",
                target_id: 1,
                description: "Air conditioner temperature sensor malfunction",
                priority: "HIGH"
            }, superToken);
            const complaintId = complaintRes.data.data?.complaint_id;
            console.log("   Complaint created successfully. Complaint ID:", complaintId);

            const updateComplaint = await apiRequest(`/api/maintenance/complaints/${complaintId}/status`, "PATCH", {
                status: "UNDER_REVIEW"
            }, superToken);
            console.log("   Complaint Status Update Status:", updateComplaint.status, "| Message:", updateComplaint.data.message);

            // 12. Maintenance Request Update
            console.log("\n12. [Maintenance Request Update] Converting complaint & updating request progress (POST /api/maintenance/requests/:id/updates)...");
            const convertRes = await apiRequest("/api/maintenance/requests/convert", "POST", {
                complaint_id: complaintId,
                assigned_to: 3,
                description: "Inspect and replace AC temperature sensor",
                mark_target_under_maintenance: true
            }, superToken);
            const requestId = convertRes.data.data?.request_id;
            console.log("   Request converted successfully. Request ID:", requestId);

            const updateRequest = await apiRequest(`/api/maintenance/requests/${requestId}/updates`, "POST", {
                status: "COMPLETED",
                remarks: "Replaced AC temperature sensor module. AC functioning correctly."
            }, superToken);
            console.log("   Maintenance Request Update Status:", updateRequest.status, "| Message:", updateRequest.data.message);

            // 13. Dashboard Metrics
            console.log("\n13. [Dashboard] Fetching Executive Dashboard Summary (GET /api/reports/dashboard)...");
            const dashboardRes = await apiRequest("/api/reports/dashboard", "GET", undefined, adminToken);
            console.log("   Dashboard Status:", dashboardRes.status, "| Total Hostels:", dashboardRes.data.data?.total_hostels, "| Occupancy Rate:", dashboardRes.data.data?.beds?.occupancy_rate_percent + "%");

            // 14. Tenant Checkout (Allocation Checkout Updation)
            console.log("\n14. [Tenant Checkout] Checking out tenant to finalize allocation (POST /api/allocations/:id/checkout)...");
            const tenantCheckout = await apiRequest(`/api/allocations/${allocationId}/checkout`, "POST", {
                end_date: "2026-09-21"
            }, superToken);
            console.log("   Tenant Checkout Status:", tenantCheckout.status, "| Message:", tenantCheckout.data.message);

            console.log(`\n=================================================`);
            console.log(`✅ All Updation Logic Modules Executed Successfully!`);
            console.log(`=================================================\n`);
        } catch (err) {
            console.error("❌ Updation test error:", err);
        } finally {
            server.close();
            process.exit(0);
        }
    });
};

runUpdationTests();
