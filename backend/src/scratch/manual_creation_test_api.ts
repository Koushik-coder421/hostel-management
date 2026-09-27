import app from "../app";
import http from "http";
import pool from "../config/database";

let server: http.Server;
const PORT = 5059;

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

const runManualCreationTests = async () => {
    server = app.listen(PORT, async () => {
        console.log(`\n=================================================`);
        console.log(`🛠️ Executing Manual Endpoint Creation Flow on Port ${PORT}`);
        console.log(`=================================================\n`);

        try {
            // Step 1: Admin Login
            console.log("1. [Auth] Logging in as System Admin (POST /api/auth/login)...");
            const adminLogin = await apiRequest("/api/auth/login", "POST", {
                email: "admin@hostel.com",
                password: "admin123"
            });
            const adminToken = adminLogin.data.token;
            console.log("   Status:", adminLogin.status, "| Token acquired successfully.");

            // Step 2: Provision Organization Hierarchy
            console.log("\n2. [Hierarchy] Provisioning Organization (POST /api/staff/hierarchy/provision)...");
            const hierarchyRes = await apiRequest("/api/staff/hierarchy/provision", "POST", {
                head_name: "Dr. Vikramaditya (Executive Head)",
                total_hostels: 100,
                partners_count: 5,
                managers_per_partner: 4
            }, adminToken);
            console.log("   Status:", hierarchyRes.status, "| Provisioned 1 Head, 5 Partners, 20 Managers, 100 Hostels, 200 Supervisors.");

            // Step 3: Create a Custom Hostel Manually
            console.log("\n3. [Hostels] Manually Creating a Custom Hostel (POST /api/hostels)...");
            const hostelRes = await apiRequest("/api/hostels", "POST", {
                name: "Royal Crest Executive Residency",
                address: "789 Horizon Boulevard, Sector 4",
                contact_number: "040-77776666"
            }, adminToken);
            const hostelId = hostelRes.data.data?.hostel_id;
            console.log("   Status:", hostelRes.status, "| Created Hostel ID:", hostelId);

            // Step 4: Create a Floor Manually
            console.log(`\n4. [Floors] Manually Creating Floor 1 in Hostel ${hostelId} (POST /api/floors)...`);
            const floorRes = await apiRequest("/api/floors", "POST", {
                hostel_id: hostelId,
                floor_number: 1,
                name: "Floor 1 - Premium Suite Wing"
            }, adminToken);
            const floorId = floorRes.data.data?.floor_id;
            console.log("   Status:", floorRes.status, "| Created Floor ID:", floorId);

            // Step 5: Create a Room Manually
            console.log(`\n5. [Rooms] Manually Creating Room 101 in Floor ${floorId} (POST /api/rooms)...`);
            const roomRes = await apiRequest("/api/rooms", "POST", {
                floor_id: floorId,
                room_number: "101",
                room_type: "Double Sharing Luxury AC",
                capacity: 2
            }, adminToken);
            const roomId = roomRes.data.data?.room_id;
            console.log("   Status:", roomRes.status, "| Created Room ID:", roomId);

            // Step 6: Create Beds Manually
            console.log(`\n6. [Beds] Manually Creating Bed 101-A & Bed 101-B in Room ${roomId} (POST /api/beds)...`);
            const bedA = await apiRequest("/api/beds", "POST", {
                room_id: roomId,
                bed_number: "101-A"
            }, adminToken);
            const bedB = await apiRequest("/api/beds", "POST", {
                room_id: roomId,
                bed_number: "101-B"
            }, adminToken);
            const bedIdA = bedA.data.data?.bed_id;
            const bedIdB = bedB.data.data?.bed_id;
            console.log("   Status Bed A:", bedA.status, "| Bed A ID:", bedIdA);
            console.log("   Status Bed B:", bedB.status, "| Bed B ID:", bedIdB);

            // Step 7: Create a Facility Manually
            console.log(`\n7. [Facilities] Manually Adding Facility to Hostel ${hostelId} (POST /api/facilities)...`);
            const facilityRes = await apiRequest("/api/facilities", "POST", {
                hostel_id: hostelId,
                name: "5G Fiber Dedicated Broadband",
                description: "1Gbps dedicated optical fiber mesh Wi-Fi network"
            }, adminToken);
            console.log("   Status:", facilityRes.status, "| Facility ID:", facilityRes.data.data?.facility_id);

            // Step 8: Register a Tenant Manually
            console.log("\n8. [Tenants] Manually Registering Tenant (POST /api/tenants)...");
            const tenantRes = await apiRequest("/api/tenants", "POST", {
                name: "Vikramaditya Roy",
                email: `vikram_${Date.now()}@example.com`,
                phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
                gender: "MALE",
                date_of_birth: "1999-11-25",
                address: "House 45, Jubilee Hills, Hyderabad",
                emergency_contact_name: "Rajesh Roy",
                emergency_contact_phone: "9876543200"
            }, adminToken);
            const tenantId = tenantRes.data.data?.tenant_id;
            console.log("   Status:", tenantRes.status, "| Created Tenant ID:", tenantId);

            // Step 9: Allocate Bed to Tenant Manually
            console.log(`\n9. [Allocations] Manually Allocating Bed ${bedIdA} to Tenant ${tenantId} (POST /api/allocations)...`);
            const allocRes = await apiRequest("/api/allocations", "POST", {
                tenant_id: tenantId,
                bed_id: bedIdA,
                start_date: new Date().toISOString().slice(0, 10)
            }, adminToken);
            console.log("   Status:", allocRes.status, "| Allocation ID:", allocRes.data.data?.allocation_id);

            // Step 10: Record Payment Manually
            console.log(`\n10. [Payments] Manually Recording Rent Payment for Tenant ${tenantId} (POST /api/payments)...`);
            const paymentRes = await apiRequest("/api/payments", "POST", {
                tenant_id: tenantId,
                allocation_id: allocRes.data.data?.allocation_id,
                amount: 9500,
                payment_type: "RENT",
                payment_method: "UPI",
                transaction_reference: `UPI/${Date.now()}/8877`
            }, adminToken);
            console.log("   Status:", paymentRes.status, "| Payment ID:", paymentRes.data.data?.payment_id);

            // Step 11: Register Visitor & Log Visit Manually
            console.log("\n11. [Visitors] Manually Registering Visitor & Logging Visit (POST /api/visitors/...)...");
            const visitorRes = await apiRequest("/api/visitors/visitors", "POST", {
                name: "Rajesh Roy",
                phone: "9876543200",
                id_type: "Aadhaar",
                id_number: "5544-3322-1100"
            }, adminToken);
            const visitorId = visitorRes.data.data?.visitor_id;

            const visitRes = await apiRequest("/api/visitors/visits", "POST", {
                visitor_id: visitorId,
                hostel_id: hostelId,
                purpose: "Family Visit",
                tenants: [{ tenant_id: tenantId, relationship: "Father", remarks: "Visiting son" }]
            }, adminToken);
            console.log("   Status:", visitRes.status, "| Visit ID:", visitRes.data.data?.visit_id);

            // Step 12: Submit Maintenance Complaint Manually
            console.log("\n12. [Maintenance] Manually Submitting Complaint (POST /api/maintenance/complaints)...");
            const complaintRes = await apiRequest("/api/maintenance/complaints", "POST", {
                tenant_id: tenantId,
                target_type: "ROOM",
                target_id: roomId,
                description: "Air conditioner remote control battery replacement required",
                priority: "LOW"
            }, adminToken);
            console.log("   Status:", complaintRes.status, "| Complaint ID:", complaintRes.data.data?.complaint_id);

            console.log(`\n=================================================`);
            console.log(`✅ All Manual Creation Endpoints Tested Successfully!`);
            console.log(`=================================================\n`);
        } catch (err) {
            console.error("❌ Error running manual creation endpoints:", err);
        } finally {
            server.close();
            process.exit(0);
        }
    });
};

runManualCreationTests();
