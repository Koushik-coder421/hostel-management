import type {
  AppData,
  DemoFixtures,
  HostelSummary,
  Invoice,
  Organization,
  ResidentListItem,
  ResidentPage,
  Role,
  RoomCardData,
} from "./contracts";
/** Entirely invented demo records. These fixtures contain no production exports or credentials. */
export function createDemoFixtures(role: Role = "manager"): DemoFixtures {
  const createdAt = new Date("2026-09-01T09:00:00+05:30");
  const hostel: HostelSummary = {
    id: "demo-hostel-a",
    organizationId: "demo-org",
    name: "Willow House Demo",
    code: "WHD",
    city: "Demo City",
    addressLine1: "12 Example Lane",
    status: "active",
    timezone: "Asia/Kolkata",
    physicalBeds: 6,
    sellableBeds: 5,
    occupiedBeds: 2,
    availableBeds: 2,
    occupancyRate: 40,
    residentCount: 2,
    isActive: true,
  };
  const organization: Organization = {
    id: "demo-org",
    name: "Willow Living Demo",
    slug: "willow-demo",
    status: "active",
    createdAt,
    hostelCount: 1,
    residentCount: 2,
    billedPaise: 1800000,
    outstandingPaise: 400000,
  };
  const app: AppData = {
    user: {
      id: `demo-user-${role}`,
      name: "Demo Operator",
      email: `${role}@example.invalid`,
      image: null,
    },
    scope: {
      userId: `demo-user-${role}`,
      role,
      organizationId: role === "platform_admin" ? null : organization.id,
      allowedHostelIds: [hostel.id],
      activeHostelId: hostel.id,
    },
    hostels: [{ id: hostel.id, name: hostel.name, code: hostel.code }],
  };
  const residents: ResidentListItem[] = [
    {
      id: "demo-resident-a",
      fullName: "Sample Resident A",
      phone: "0000000001",
      email: "resident.a@example.invalid",
      gender: "undisclosed",
      status: "active",
      createdAt,
      roomNumber: "101",
      bedLabel: "A",
      agreedRentPaise: 900000,
      startDate: "2026-09-01",
    },
    {
      id: "demo-resident-b",
      fullName: "Sample Resident B",
      phone: "0000000002",
      email: "resident.b@example.invalid",
      gender: "undisclosed",
      status: "active",
      createdAt,
      roomNumber: "102",
      bedLabel: "A",
      agreedRentPaise: 900000,
      startDate: "2026-09-01",
    },
    {
      id: "demo-resident-c",
      fullName: "Sample Former Resident",
      phone: "0000000003",
      email: null,
      gender: "undisclosed",
      status: "checked_out",
      createdAt: new Date("2026-08-01T09:00:00+05:30"),
    },
  ];
  const rooms: RoomCardData[] = Array.from({ length: 3 }, (_, index) => {
    const occupied = index < 2;
    const secondary =
      index === 0 ? "available" : index === 1 ? "blocked" : "maintenance";
    return {
      id: `demo-room-${index + 1}`,
      roomNumber: String(101 + index),
      floorId: "demo-floor",
      floorLabel: "First floor",
      floorSortOrder: 1,
      buildingId: "demo-building",
      buildingName: "Willow Wing",
      roomTypeId: "demo-room-type",
      roomTypeName: "Twin sharing",
      acType: "non_ac",
      standardCapacity: 2,
      isStore: false,
      status: "active",
      occupiedCount: occupied ? 1 : 0,
      blockedCount: index === 1 ? 1 : 0,
      availableCount: index === 1 ? 0 : 1,
      totalBeds: 2,
      sharingLabel: "Twin sharing",
      statusColor: index === 1 ? "red" : "green",
      beds: [
        {
          id: `demo-bed-${index + 1}-a`,
          bedLabel: "A",
          operationalStatus: "in_service",
          status: occupied ? "occupied" : "available",
          ...(occupied
            ? {
                residentName: residents[index].fullName,
                residentId: residents[index].id,
              }
            : {}),
        },
        {
          id: `demo-bed-${index + 1}-b`,
          bedLabel: "B",
          operationalStatus:
            secondary === "maintenance" ? "maintenance" : "in_service",
          status: secondary,
        },
      ],
    };
  });
  const buildings = [
    { id: "demo-building", name: "Willow Wing", sortOrder: 1 },
  ];
  const floors = [
    {
      id: "demo-floor",
      buildingId: "demo-building",
      label: "First floor",
      sortOrder: 1,
    },
  ];
  const invoices: Invoice[] = residents
    .slice(0, 2)
    .map((resident, index) => ({
      id: `demo-invoice-${index + 1}`,
      invoiceNumber: `DEMO-2026-00${index + 1}`,
      residentName: resident.fullName,
      residentPhone: resident.phone,
      residentId: resident.id,
      totalPaise: 900000,
      paidPaise: index === 0 ? 500000 : 900000,
      outstandingPaise: index === 0 ? 400000 : 0,
      dueDate: "2026-09-05",
      issueDate: "2026-09-01",
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
      status: index === 0 ? "partially_paid" : "paid",
    }));
  const activity = [
    {
      id: "demo-event",
      action: "resident.checked_in",
      entityType: "resident",
      createdAt,
      metadata: { residentName: residents[0].fullName, roomNumber: "101" },
    },
  ];
  const residentDetails: Record<string, ResidentPage> = {};
  for (const [index, resident] of residents.entries()) {
    const invoice = invoices.find((item) => item.residentId === resident.id);
    const active = resident.status === "active";
    residentDetails[resident.id] = {
      resident: {
        ...resident,
        emergencyContactName: "Sample Emergency Contact",
        emergencyContactPhone: "0000000000",
        room: active
          ? { id: rooms[index].id, roomNumber: rooms[index].roomNumber }
          : null,
        bed: active ? { id: rooms[index].beds[0].id, bedLabel: "A" } : null,
        activeAgreement: active
          ? {
              id: `demo-agreement-${index}`,
              status: "active",
              agreedRentPaise: 900000,
              agreedDepositPaise: 1800000,
              billingDay: 5,
              startDate: "2026-09-01",
              expectedEndDate: null,
              noticePeriodDays: 30,
            }
          : null,
        ratePlan: active
          ? { id: "demo-rate-plan", name: "Twin monthly" }
          : null,
      },
      location: {
        buildingName: active ? "Willow Wing" : null,
        floorLabel: active ? "First floor" : null,
      },
      invoices: invoice ? [invoice] : [],
      payments: invoice
        ? [
            {
              id: `demo-payment-${index}`,
              receivedAt: new Date("2026-09-03T10:00:00+05:30"),
              paymentMethod: "upi",
              reference: `DEMO-REF-${index}`,
              amountPaise: invoice.paidPaise,
              status: "succeeded",
              notes: "Synthetic demo payment",
            },
          ]
        : [],
      financialSummary: {
        totalBilledPaise: invoice?.totalPaise ?? 0,
        totalPaidPaise: invoice?.paidPaise ?? 0,
        totalOutstandingPaise: invoice?.outstandingPaise ?? 0,
      },
      activityTimeline: active
        ? [
            {
              ...activity[0],
              id: `demo-event-${index}`,
              metadata: { residentName: resident.fullName },
            },
          ]
        : [],
    };
  }
  const occupancy = {
    physicalBeds: 6,
    sellableBeds: 5,
    occupiedBeds: 2,
    availableBeds: 2,
    occupancyRate: 40,
  };
  const managerData = {
    ...occupancy,
    hostelName: hostel.name,
    blockedBeds: 1,
    activeResidents: 2,
    overdueInvoices: 1,
    collectionsTodayPaise: 0,
    paymentsDueToday: 0,
    expectedCheckouts: 0,
    recentActivity: activity,
    overdueInvoicesList: [
      {
        residentName: residents[0].fullName,
        amountPaise: 400000,
        daysOverdue: 18,
      },
    ],
  };
  return {
    app,
    residentDetails,
    pages: {
      "/dashboard": {
        role,
        platformData:
          role === "platform_admin"
            ? {
                activeOrganizations: 1,
                activeHostels: 1,
                activeResidents: 2,
                currentMonthBilledPaise: 1800000,
                currentMonthCollectedPaise: 1400000,
                totalOutstandingPaise: 400000,
                totalOverduePaise: 400000,
                overdueInvoicesCount: 1,
                organizations: [{ ...organization, overduePaise: 400000 }],
              }
            : null,
        orgData:
          role === "organization_admin"
            ? {
                ...occupancy,
                organizationName: organization.name,
                hostelCount: 1,
                totalResidents: 2,
                currentMonthBilledPaise: 1800000,
                currentMonthCollectedPaise: 1400000,
                totalOutstandingPaise: 400000,
                totalOverduePaise: 400000,
                hostels: [{ ...hostel, outstandingPaise: 400000 }],
              }
            : null,
        managerData:
          role === "manager" || role === "organization_admin"
            ? managerData
            : null,
      },
      "/organizations": { organizations: [organization] },
      "/hostels": { hostels: [hostel], activeHostelId: hostel.id },
      "/managers": {
        managers: [
          {
            bindingId: "demo-binding",
            userId: "demo-colleague",
            name: "Sample Manager",
            email: "manager@example.invalid",
            role: "manager",
            organizationId: organization.id,
            hostelId: hostel.id,
            isActive: true,
            createdAt,
            canManage: role !== "manager",
            hostelName: hostel.name,
            orgName: organization.name,
          },
        ],
        hostels: [hostel],
        organizations: [organization],
      },
      "/rooms": {
        hostel,
        floors: [
          {
            ...floors[0],
            buildingName: buildings[0].name,
            rooms,
            totalRooms: 3,
            occupiedBeds: 2,
            totalBeds: 6,
            availableBeds: 2,
          },
        ],
        buildings,
        stats: {
          totalRooms: 3,
          totalBeds: 6,
          occupiedBeds: 2,
          availableBeds: 2,
        },
      },
      "/residents": {
        hostel,
        residents,
        stats: { total: 3, active: 2, checkedOut: 1 },
        filters: { search: "", status: "all" },
      },
      "/residents/:id": residentDetails[residents[0].id],
      "/check-ins": {
        hostel,
        buildings,
        floors,
        rooms,
        availableBeds: rooms.flatMap((room) =>
          room.beds
            .filter((bed) => bed.status === "available")
            .map((bed) => ({
              id: bed.id,
              bedLabel: bed.bedLabel,
              roomId: room.id,
            })),
        ),
        ratePlans: [
          {
            id: "demo-rate-plan",
            roomTypeId: "demo-room-type",
            name: "Twin monthly",
            occupancyCount: 2,
            rentPaise: 900000,
            depositPaise: 1800000,
          },
        ],
        preselectedRoomId: null,
      },
      "/check-outs": {
        activeResidents: residents
          .slice(0, 2)
          .map((resident, index) => ({
            allocationId: `demo-allocation-${index}`,
            residentId: resident.id,
            residentName: resident.fullName,
            phone: resident.phone,
            email: resident.email,
            gender: resident.gender,
            occupiedFrom: createdAt,
            agreementId: `demo-agreement-${index}`,
            agreedRentPaise: 900000,
            billingDay: 5,
            roomNumber: rooms[index].roomNumber,
            bedLabel: "A",
            roomId: rooms[index].id,
            bedId: rooms[index].beds[0].id,
          })),
        recentCheckouts: [
          {
            residentId: residents[2].id,
            residentName: residents[2].fullName,
            phone: residents[2].phone,
            roomNumber: "103",
            bedLabel: "A",
            occupiedFrom: new Date("2026-08-01T09:00:00+05:30"),
            occupiedUntil: new Date("2026-09-01T09:00:00+05:30"),
          },
        ],
      },
      "/payments": { invoices },
      "/reports": {
        hostel,
        floorOccupancy: [
          {
            floorId: "demo-floor",
            floorLabel: "First floor",
            buildingName: "Willow Wing",
            roomCount: 3,
            totalBeds: 6,
            sellableBeds: 5,
            occupiedBeds: 2,
            blockedBeds: 1,
            maintenanceBeds: 1,
            availableBeds: 2,
            occupancyRate: 40,
          },
        ],
        agingBuckets: [
          {
            bucket: "8-30 days",
            count: 1,
            totalOutstandingPaise: 400000,
            invoices: [
              {
                invoiceId: invoices[0].id,
                invoiceNumber: invoices[0].invoiceNumber,
                residentName: residents[0].fullName,
                dueDate: "2026-09-05",
                daysOverdue: 18,
                totalPaise: 900000,
                outstandingPaise: 400000,
              },
            ],
          },
        ],
        occupancySummary: { ...occupancy, blockedBeds: 1, maintenanceBeds: 1 },
        financialSummary: {
          totalBilledPaise: 1800000,
          totalCollectedPaise: 1400000,
          totalOutstandingPaise: 400000,
          collectionRate: 78,
        },
      },
      "/settings": {
        user: app.user,
        scope: app.scope,
        systemInfo: {
          appName: "EasyPG Frontend Demo",
          locale: "en-IN",
          timezone: "Asia/Kolkata",
          currency: "INR (₹)",
          version: "Frontend demonstration",
        },
      },
      "/login": { user: null, scope: null },
    },
  };
}
