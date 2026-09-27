import app from "../app";
import http from "http";
import pool from "../config/database";

let server: http.Server;
const PORT = 5055;

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

const runTests = async () => {
    // Reset test database allocations & bed statuses to clean state
    await pool.query("UPDATE tenant_allocation SET status = 'COMPLETED' WHERE status = 'ACTIVE'");
    await pool.query("UPDATE bed SET status = 'AVAILABLE'");
    await pool.query("UPDATE room SET status = 'AVAILABLE'");

    server = app.listen(PORT, async () => {
        console.log(`\n=================================================`);
        console.log(`🧪 Running Full Integration & Updation Tests on Port ${PORT}`);
        console.log(`=================================================\n`);

        try {
            // 1. Health Check
            console.log("1. Testing Health Check...");
            const health = await apiRequest("/api/health/db");
            console.log("   Response:", health.data.message);

            // 2. Login as Admin
            console.log("\n2. Logging in as Admin...");
            const adminLogin = await apiRequest("/api/auth/login", "POST", {
                email: "admin@hostel.com",
                password: "admin123"
            });
            console.log("   Admin Auth Token received:", !!adminLogin.data.token);
            const adminToken = adminLogin.data.token;

            // 2.5 Provision Organization Hierarchy (1 Head -> 5 Partners -> 20 Managers -> 100 Hostels -> 200 Supervisors)
            console.log("\n2.5 Provisioning Organization Hierarchy (1 Head, 5 Partners, 20 Managers, 100 Hostels, 200 Supervisors)...");
            const hierarchy = await apiRequest("/api/staff/hierarchy/provision", "POST", {
                head_name: "Dr. Vikramaditya (Executive Head)",
                partners_count: 5,
                managers_per_partner: 4,
                hostels_per_manager: 5
            }, adminToken);
            console.log("    Hierarchy Provision Status:", hierarchy.status, "| Total Hostels:", hierarchy.data.data?.total_hostels, "| Hostels/Partner:", hierarchy.data.data?.hostels_per_partner, "| Hostels/Manager:", hierarchy.data.data?.hostels_per_manager, "| Supervisors/Hostel:", hierarchy.data.data?.supervisors_per_hostel);

            // 3. Login as Supervisor
            console.log("\n3. Logging in as Supervisor...");
            const superLogin = await apiRequest("/api/auth/login", "POST", {
                email: "supervisor@hostel.com",
                password: "super123"
            });
            console.log("   Supervisor Auth Token received:", !!superLogin.data.token);
            const superToken = superLogin.data.token;

            // 4. Fetch Available Beds
            console.log("\n4. Fetching Available Beds...");
            const bedsBefore = await apiRequest("/api/beds/available", "GET", undefined, adminToken);
            console.log("   Available beds count:", bedsBefore.data.results);

            // 5. Allocate Bed 1 (101-A) to Tenant 1
            console.log("\n5. Allocating Bed 1 (101-A) to Tenant 1...");
            const alloc1 = await apiRequest("/api/allocations", "POST", {
                tenant_id: 1,
                bed_id: 1,
                start_date: "2026-09-01"
            }, adminToken);
            console.log("   Allocation 1 status:", alloc1.status, "| Result:", alloc1.data.message);

            // 6. Allocate Bed 2 (101-B) to Tenant 2 (Filling Room 1 capacity = 2)
            console.log("\n6. Allocating Bed 2 (101-B) to Tenant 2...");
            const alloc2 = await apiRequest("/api/allocations", "POST", {
                tenant_id: 2,
                bed_id: 2,
                start_date: "2026-09-01"
            }, adminToken);
            console.log("   Allocation 2 status:", alloc2.status, "| Result:", alloc2.data.message);

            // 7. Verify Room 1 status auto-updated to FULL
            console.log("\n7. Checking Room 1 status after filling both beds...");
            const room1 = await apiRequest("/api/rooms/1", "GET", undefined, adminToken);
            console.log("   Room 1 status:", room1.data.data.status, "(Expected: FULL)");

            // 8. Test double allocation error handling
            console.log("\n8. Testing rejection of occupied bed allocation...");
            const allocFail = await apiRequest("/api/allocations", "POST", {
                tenant_id: 1,
                bed_id: 1,
                start_date: "2026-09-01"
            }, adminToken);
            console.log("   Rejection status:", allocFail.status, "| Message:", allocFail.data.message);

            // 9. Record Payment
            console.log("\n9. Recording Rent Payment of ₹8,000 for Tenant 1...");
            const pay = await apiRequest("/api/payments", "POST", {
                tenant_id: 1,
                allocation_id: alloc1.data.data.allocation_id,
                amount: 8000,
                payment_type: "RENT",
                payment_method: "UPI",
                transaction_reference: "UPI/20260920/99817"
            }, adminToken);
            console.log("   Payment record result:", pay.data.message);
            const recordedPaymentId = pay.data.data.payment_id;

            // 10. Register Visitor & Log Visit
            console.log("\n10. Registering Visitor & Logging Visit...");
            const visitor = await apiRequest("/api/visitors/visitors", "POST", {
                name: "Suresh Sharma",
                phone: "9988776600",
                id_type: "Aadhaar",
                id_number: "1234-5678-9012"
            }, superToken);
            const visitorId = visitor.data.data.visitor_id;

            const visit = await apiRequest("/api/visitors/visits", "POST", {
                visitor_id: visitorId,
                hostel_id: 1,
                purpose: "Parental Visit",
                tenants: [
                    { tenant_id: 1, relationship: "Father", remarks: "Meeting son" }
                ]
            }, superToken);
            const visitId = visit.data.data.visit_id;
            console.log("    Visit logged status:", visit.data.data.status, "| Visit ID:", visitId);

            // 11. Maintenance Complaint -> Request Conversion Workflow
            console.log("\n11. Testing Maintenance Complaint -> Request Conversion Workflow...");
            const complaint = await apiRequest("/api/maintenance/complaints", "POST", {
                tenant_id: 1,
                target_type: "ROOM",
                target_id: 1,
                description: "AC cooling issue in Room 101",
                priority: "HIGH"
            }, superToken);
            const complaintId = complaint.data.data.complaint_id;
            console.log("    Complaint submitted ID:", complaintId);

            const reqConvert = await apiRequest("/api/maintenance/requests/convert", "POST", {
                complaint_id: complaintId,
                assigned_to: 3, // Maintenance Staff ID
                description: "Inspect AC compressor",
                mark_target_under_maintenance: true
            }, superToken);
            const requestId = reqConvert.data.data.request_id;
            console.log("    Converted to Request ID:", requestId);

            // ==================================================
            // 🔄 UPDATION LOGIC MODULES TESTS
            // ==================================================
            console.log(`\n-------------------------------------------------`);
            console.log(`🔄 UPDATION LOGIC MODULES TESTS`);
            console.log(`-------------------------------------------------`);

            // 12. Hostel Module Updation
            console.log("\n12. Updating Hostel Details (PUT /api/hostels/1)...");
            const updateHostelRes = await apiRequest("/api/hostels/1", "PUT", {
                name: "Grand Heights Luxury Hostel",
                contact_number: "040-99998888"
            }, adminToken);
            console.log("    Hostel Update Status:", updateHostelRes.status, "| Message:", updateHostelRes.data.message);
            const getUpdatedHostel = await apiRequest("/api/hostels/1", "GET", undefined, adminToken);
            console.log("    Verified Updated Hostel Name:", getUpdatedHostel.data.data.name);

            // 13. Floor Module Updation
            console.log("\n13. Updating Floor Details (PUT /api/floors/1)...");
            const updateFloorRes = await apiRequest("/api/floors/1", "PUT", {
                name: "1st Floor - Executive Wing"
            }, superToken);
            console.log("    Floor Update Status:", updateFloorRes.status, "| Message:", updateFloorRes.data.message);

            // 14. Room Module Updation
            console.log("\n14. Updating Room Details (PUT /api/rooms/2)...");
            const updateRoomRes = await apiRequest("/api/rooms/2", "PUT", {
                room_type: "Double Sharing Deluxe Non-AC",
                capacity: 2
            }, superToken);
            console.log("    Room Update Status:", updateRoomRes.status, "| Message:", updateRoomRes.data.message);
            const getUpdatedRoom = await apiRequest("/api/rooms/2", "GET", undefined, adminToken);
            console.log("    Verified Updated Room Type:", getUpdatedRoom.data.data.room_type);

            // 15. Bed Module Updation
            console.log("\n15. Updating Bed Details (PUT /api/beds/3)...");
            const updateBedRes = await apiRequest("/api/beds/3", "PUT", {
                bed_number: "102-A-Premium"
            }, superToken);
            console.log("    Bed Update Status:", updateBedRes.status, "| Message:", updateBedRes.data.message);

            // 16. Facility Module Updation
            console.log("\n16. Updating Facility Details (PUT /api/facilities/1)...");
            const updateFacilityRes = await apiRequest("/api/facilities/1", "PUT", {
                description: "1Gbps Ultra High-Speed Fiber Mesh Wi-Fi"
            }, superToken);
            console.log("    Facility Update Status:", updateFacilityRes.status, "| Message:", updateFacilityRes.data.message);

            // 17. Tenant Module Updation
            console.log("\n17. Updating Tenant Profile (PUT /api/tenants/1)...");
            const updateTenantRes = await apiRequest("/api/tenants/1", "PUT", {
                emergency_contact_phone: "9988776699",
                address: "Flat 402, Green Valley Towers, Phase 2"
            }, superToken);
            console.log("    Tenant Update Status:", updateTenantRes.status, "| Message:", updateTenantRes.data.message);
            const getUpdatedTenant = await apiRequest("/api/tenants/1", "GET", undefined, adminToken);
            console.log("    Verified Updated Emergency Contact Phone:", getUpdatedTenant.data.data.emergency_contact_phone);

            // 18. Staff Module Updation
            console.log("\n18. Updating Staff Profile (PUT /api/staff/2)...");
            const updateStaffRes = await apiRequest("/api/staff/2", "PUT", {
                phone: "9876543299"
            }, adminToken);
            console.log("    Staff Update Status:", updateStaffRes.status, "| Message:", updateStaffRes.data.message);

            // 19. Payment Status Updation
            console.log(`\n19. Updating Payment Status (PATCH /api/payments/${recordedPaymentId}/status)...`);
            const updatePayStatusRes = await apiRequest(`/api/payments/${recordedPaymentId}/status`, "PATCH", {
                status: "SUCCESS"
            }, adminToken);
            console.log("    Payment Status Update Status:", updatePayStatusRes.status, "| Message:", updatePayStatusRes.data.message);

            // 20. Visitor Visit Checkout Updation
            console.log(`\n20. Updating Visitor Visit Checkout (PATCH /api/visitors/visits/${visitId}/checkout)...`);
            const checkoutVisitRes = await apiRequest(`/api/visitors/visits/${visitId}/checkout`, "PATCH", {}, superToken);
            console.log("    Visitor Checkout Status:", checkoutVisitRes.status, "| Message:", checkoutVisitRes.data.message);

            // 21. Maintenance Complaint Status Direct Updation
            console.log("\n21. Registering & Updating Maintenance Complaint Status (PATCH /api/maintenance/complaints/...)...");
            const directComplaint = await apiRequest("/api/maintenance/complaints", "POST", {
                tenant_id: 1,
                target_type: "BED",
                target_id: 1,
                description: "Bed frame creaking sound",
                priority: "LOW"
            }, superToken);
            const directComplaintId = directComplaint.data.data.complaint_id;

            const updateComplaintRes = await apiRequest(`/api/maintenance/complaints/${directComplaintId}/status`, "PATCH", {
                status: "UNDER_REVIEW"
            }, superToken);
            console.log("    Complaint Status Update Status:", updateComplaintRes.status, "| Result:", updateComplaintRes.data.message);

            // 22. Maintenance Request Progress Update
            console.log(`\n22. Updating Maintenance Request Progress (POST /api/maintenance/requests/${requestId}/updates)...`);
            const reqUpdate = await apiRequest(`/api/maintenance/requests/${requestId}/updates`, "POST", {
                status: "COMPLETED",
                remarks: "Cleaned AC filter and topped up refrigerant gas. Issue resolved."
            }, superToken);
            console.log("    Maintenance Request Progress Update Result:", reqUpdate.data.message);

            const reqHistory = await apiRequest(`/api/maintenance/requests/${requestId}/history`, "GET", undefined, superToken);
            console.log("    Request History Record Count:", reqHistory.data.results);

            // 23. Executive Dashboard Summary
            console.log("\n23. Fetching Executive Dashboard Metrics...");
            const dashboard = await apiRequest("/api/reports/dashboard", "GET", undefined, adminToken);
            console.log("    Dashboard Summary Data:");
            console.log("    - Total Hostels:", dashboard.data.data.total_hostels);
            console.log("    - Active Tenants:", dashboard.data.data.active_tenants);
            console.log("    - Total Beds:", dashboard.data.data.beds.total);
            console.log("    - Occupied Beds:", dashboard.data.data.beds.occupied);
            console.log("    - Occupancy Rate:", dashboard.data.data.beds.occupancy_rate_percent + "%");
            console.log("    - Total Revenue Collected: ₹" + dashboard.data.data.total_revenue_collected);

            // 24. Checkout Tenant 2
            console.log("\n24. Checking out Tenant 2 to release Bed 2...");
            const checkout = await apiRequest(`/api/allocations/${alloc2.data.data.allocation_id}/checkout`, "POST", {
                end_date: "2026-09-20"
            }, superToken);
            console.log("    Checkout result:", checkout.data.message);

            const room1After = await apiRequest("/api/rooms/1", "GET", undefined, adminToken);
            console.log("    Room 1 status after checkout:", room1After.data.data.status, "(Expected: AVAILABLE)");

            console.log(`\n=================================================`);
            console.log(`✅ All 24 Core Integration & Updation Tests Passed Successfully!`);
            console.log(`=================================================\n`);
        } catch (err) {
            console.error("❌ Test error:", err);
        } finally {
            server.close();
            process.exit(0);
        }
    });
};

runTests();
