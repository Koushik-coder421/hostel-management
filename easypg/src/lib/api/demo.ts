import { createDemoFixtures } from "./fixtures";
import {
  decodePaise,
  type AppData,
  type DemoFixtures,
  type PageDataMap,
  type ResidentPage,
  type Role,
} from "./contracts";
import type { CommandInput, CommandResult, Operation } from "./operations";
import { ApiError } from "./errors";
import { decodeView, encodeView } from "./transport";

/** Browser-only scenario simulation. This is not a tenancy, billing or authentication backend. */
export function createDemoAdapter() {
  let state: DemoFixtures | null = null;
  const receipts = new Map<
    string,
    { fingerprint: string; result: CommandResult }
  >();
  const storageKey = "easypg.frontend.demo.v1";
  try {
    const stored =
      typeof sessionStorage === "undefined"
        ? null
        : sessionStorage.getItem(storageKey);
    if (stored) {
      const restored = decodeView(JSON.parse(stored)) as {
        state: DemoFixtures;
        receipts: [string, { fingerprint: string; result: CommandResult }][];
      };
      if (
        restored.state?.app?.user?.email?.endsWith("@example.invalid") &&
        restored.state.pages &&
        restored.state.residentDetails
      ) {
        state = restored.state;
        for (const [key, receipt] of restored.receipts ?? [])
          receipts.set(key, receipt);
      }
    }
  } catch {
    /* A malformed or unavailable demo cache simply starts a new demo session. */
  }
  const copy = <T>(value: T): T => structuredClone(value);
  const invalid: (message: string) => never = (message) => {
    throw new ApiError(message, 422, "DEMO_VALIDATION");
  };
  const conflict: (message: string) => never = (message) => {
    throw new ApiError(message, 409, "DEMO_CONFLICT");
  };
  const required = (input: CommandInput, key: string) =>
    input[key]?.trim() || invalid(`${key} is required`);
  const date = (value: string) => {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(`${value}T00:00:00+05:30`))
    )
      invalid("Enter a valid date");
    const parsed = new Date(`${value}T00:00:00+05:30`);
    if (
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(parsed) !== value
    )
      invalid("Enter a valid calendar date");
    return parsed;
  };
  const money = (input: CommandInput, key: string) => {
    let amount: number;
    try {
      amount = decodePaise(required(input, key));
    } catch {
      return invalid(`Invalid ${key}`);
    }
    return amount >= 0 ? amount : invalid("Amounts cannot be negative");
  };
  const persist = () => {
    try {
      if (typeof sessionStorage !== "undefined") {
        if (state)
          sessionStorage.setItem(
            storageKey,
            JSON.stringify(
              encodeView({ state, receipts: Array.from(receipts) }),
            ),
          );
        else sessionStorage.removeItem(storageKey);
      }
    } catch {
      /* The demo remains usable in memory when browser storage is unavailable. */
    }
  };
  const current = () =>
    state ??
    (() => {
      throw new ApiError(
        "Choose a demo account to continue",
        401,
        "UNAUTHENTICATED",
      );
    })();
  const refresh = () => {
    if (!state) return;
    const p = state.pages;
    const residents = Object.values(state.residentDetails).map(
      (detail) => detail.resident,
    );
    p["/residents"].residents = residents;
    p["/residents"].stats = {
      total: residents.length,
      active: residents.filter((r) => r.status === "active").length,
      checkedOut: residents.filter((r) => r.status === "checked_out").length,
    };
    p["/payments"].invoices = Object.values(state.residentDetails).flatMap(
      (detail) => detail.invoices,
    );
    const invoices = p["/payments"].invoices.filter((i) => i.status !== "void");
    const billed = invoices.reduce((sum, i) => sum + i.totalPaise, 0);
    const paid = invoices.reduce((sum, i) => sum + i.paidPaise, 0);
    const outstanding = billed - paid;
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const overdue = invoices.filter(
      (i) => i.dueDate < today && i.outstandingPaise > 0,
    );
    const overduePaise = overdue.reduce(
      (sum, i) => sum + i.outstandingPaise,
      0,
    );
    const roomPage = p["/rooms"];
    const rooms = roomPage.floors.flatMap((f) => f.rooms);
    for (const room of rooms) {
      room.occupiedCount = room.beds.filter(
        (b) => b.status === "occupied",
      ).length;
      room.blockedCount = room.beds.filter(
        (b) => b.status === "blocked",
      ).length;
      room.availableCount = room.beds.filter(
        (b) => b.status === "available",
      ).length;
      room.statusColor = room.availableCount ? "green" : "red";
    }
    const beds = rooms.flatMap((r) => r.beds);
    const occupied = beds.filter((b) => b.status === "occupied").length;
    const available = beds.filter((b) => b.status === "available").length;
    const sellable = beds.filter(
      (b) => b.operationalStatus === "in_service",
    ).length;
    const occupancy = {
      physicalBeds: beds.length,
      sellableBeds: sellable,
      occupiedBeds: occupied,
      availableBeds: available,
      occupancyRate: sellable ? Math.round((occupied / sellable) * 100) : 0,
    };
    for (const floor of roomPage.floors) {
      floor.occupiedBeds = floor.rooms.reduce((s, r) => s + r.occupiedCount, 0);
      floor.availableBeds = floor.rooms.reduce(
        (s, r) => s + r.availableCount,
        0,
      );
    }
    roomPage.stats = {
      totalRooms: rooms.length,
      totalBeds: beds.length,
      occupiedBeds: occupied,
      availableBeds: available,
    };
    p["/check-ins"].availableBeds = rooms.flatMap((room) =>
      room.beds
        .filter((b) => b.status === "available")
        .map((b) => ({ id: b.id, roomId: room.id, bedLabel: b.bedLabel })),
    );
    p["/check-outs"].activeResidents = residents
      .filter(
        (r) => r.status === "active" && r.activeAgreement && r.room && r.bed,
      )
      .map((r) => ({
        allocationId: `demo-allocation-${r.id}`,
        residentId: r.id,
        residentName: r.fullName,
        phone: r.phone,
        email: r.email,
        gender: r.gender,
        occupiedFrom: date(r.activeAgreement!.startDate),
        agreementId: r.activeAgreement!.id,
        agreedRentPaise: r.activeAgreement!.agreedRentPaise,
        billingDay: r.activeAgreement!.billingDay,
        roomNumber: r.room!.roomNumber,
        bedLabel: r.bed!.bedLabel,
        roomId: r.room!.id,
        bedId: r.bed!.id,
      }));
    for (const detail of Object.values(state.residentDetails)) {
      detail.financialSummary = {
        totalBilledPaise: detail.invoices.reduce((s, i) => s + i.totalPaise, 0),
        totalPaidPaise: detail.invoices.reduce((s, i) => s + i.paidPaise, 0),
        totalOutstandingPaise: detail.invoices.reduce(
          (s, i) => s + i.outstandingPaise,
          0,
        ),
      };
      for (const invoice of detail.invoices) {
        invoice.residentName = detail.resident.fullName;
        invoice.residentPhone = detail.resident.phone;
      }
    }
    for (const hostel of p["/hostels"].hostels)
      Object.assign(hostel, occupancy, {
        residentCount: occupied,
        isActive: hostel.id === state.app.scope.activeHostelId,
      });
    const org = p["/organizations"].organizations.find(
      (o) => o.id === "demo-org",
    );
    if (org)
      Object.assign(org, {
        residentCount: occupied,
        billedPaise: billed,
        outstandingPaise: outstanding,
      });
    const dashboard = p["/dashboard"];
    if (dashboard.managerData)
      Object.assign(dashboard.managerData, occupancy, {
        recentActivity: Object.values(state.residentDetails)
          .flatMap((d) => d.activityTimeline)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 10),
        collectionsTodayPaise: Object.values(state.residentDetails)
          .flatMap((d) => d.payments)
          .filter(
            (payment) =>
              new Intl.DateTimeFormat("en-CA", {
                timeZone: "Asia/Kolkata",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(payment.receivedAt) === today,
          )
          .reduce((sum, payment) => sum + payment.amountPaise, 0),
        activeResidents: occupied,
        blockedBeds: beds.filter((b) => b.status === "blocked").length,
        overdueInvoices: overdue.length,
        overdueInvoicesList: overdue.map((i) => ({
          residentName: i.residentName,
          amountPaise: i.outstandingPaise,
          daysOverdue: Math.floor(
            (date(today).getTime() - date(i.dueDate).getTime()) / 86400000,
          ),
        })),
      });
    if (dashboard.orgData)
      Object.assign(dashboard.orgData, occupancy, {
        totalResidents: occupied,
        currentMonthBilledPaise: billed,
        currentMonthCollectedPaise: paid,
        totalOutstandingPaise: outstanding,
        totalOverduePaise: overduePaise,
        hostels: p["/hostels"].hostels.map((h) => ({
          ...h,
          outstandingPaise: outstanding,
        })),
      });
    if (dashboard.platformData)
      Object.assign(dashboard.platformData, {
        activeOrganizations: p["/organizations"].organizations.filter(
          (o) => o.status === "active",
        ).length,
        activeResidents: occupied,
        currentMonthBilledPaise: billed,
        currentMonthCollectedPaise: paid,
        totalOutstandingPaise: outstanding,
        totalOverduePaise: overduePaise,
        overdueInvoicesCount: overdue.length,
        organizations: p["/organizations"].organizations.map((o) => ({
          ...o,
          overduePaise: o.id === "demo-org" ? overduePaise : 0,
        })),
      });
    Object.assign(p["/reports"].occupancySummary, occupancy, {
      blockedBeds: beds.filter((b) => b.status === "blocked").length,
      maintenanceBeds: beds.filter((b) => b.status === "maintenance").length,
    });
    p["/reports"].financialSummary = {
      totalBilledPaise: billed,
      totalCollectedPaise: paid,
      totalOutstandingPaise: outstanding,
      collectionRate: billed ? Math.round((paid / billed) * 100) : 0,
    };
    p["/reports"].floorOccupancy = roomPage.floors.map((f) => ({
      floorId: f.id,
      floorLabel: f.label,
      buildingName: f.buildingName,
      roomCount: f.rooms.length,
      totalBeds: f.totalBeds,
      sellableBeds: f.rooms
        .flatMap((r) => r.beds)
        .filter((b) => b.operationalStatus === "in_service").length,
      occupiedBeds: f.occupiedBeds,
      blockedBeds: f.rooms.reduce((s, r) => s + r.blockedCount, 0),
      maintenanceBeds: f.rooms
        .flatMap((r) => r.beds)
        .filter((b) => b.status === "maintenance").length,
      availableBeds: f.availableBeds,
      occupancyRate: occupancy.occupancyRate,
    }));
    const buckets = [
      "1-7 days",
      "8-30 days",
      "31-60 days",
      "61-90 days",
      "90+ days",
    ] as const;
    p["/reports"].agingBuckets = buckets.map((bucket) => ({
      bucket,
      count: 0,
      totalOutstandingPaise: 0,
      invoices: [],
    }));
    for (const invoice of overdue) {
      const days = Math.floor(
        (date(today).getTime() - date(invoice.dueDate).getTime()) / 86400000,
      );
      const bucket =
        p["/reports"].agingBuckets[
          days <= 7 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4
        ];
      bucket.count++;
      bucket.totalOutstandingPaise += invoice.outstandingPaise;
      bucket.invoices.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        residentName: invoice.residentName,
        dueDate: invoice.dueDate,
        daysOverdue: days,
        totalPaise: invoice.totalPaise,
        outstandingPaise: invoice.outstandingPaise,
      });
    }
    p["/settings"].scope = state.app.scope;
  };
  return {
    async getSession(): Promise<AppData | null> {
      return state ? copy(state.app) : null;
    },
    async readView<K extends keyof PageDataMap>(
      route: K,
      params: Record<string, string> = {},
    ): Promise<PageDataMap[K]> {
      if (route === "/login")
        return { user: null, scope: null } as PageDataMap[K];
      const data = current();
      refresh();
      if (route === "/residents/:id") {
        const detail =
          data.residentDetails[params.id ?? params.residentId ?? ""];
        if (!detail)
          throw new ApiError("Demo resident not found", 404, "NOT_FOUND");
        return copy(detail) as PageDataMap[K];
      }
      const view = copy(data.pages[route]);
      if (route === "/residents") {
        const residents = view as PageDataMap["/residents"];
        residents.filters = {
          search: params.q ?? "",
          status: params.status ?? "all",
        };
        residents.residents = residents.residents.filter(
          (r) =>
            (!params.q ||
              `${r.fullName} ${r.phone}`
                .toLowerCase()
                .includes(params.q.toLowerCase())) &&
            (!params.status ||
              params.status === "all" ||
              r.status === params.status),
        );
      }
      if (route === "/check-ins")
        (view as PageDataMap["/check-ins"]).preselectedRoomId =
          params.roomId ?? null;
      return view;
    },
    async command(
      operation: Operation,
      input: CommandInput,
      idempotencyKey: string,
    ): Promise<CommandResult> {
      if (!idempotencyKey) invalid("An idempotency key is required");
      const fingerprint = JSON.stringify([
        operation,
        Object.entries(input).sort(([a], [b]) => a.localeCompare(b)),
      ]);
      const previous = receipts.get(idempotencyKey);
      if (previous) {
        if (previous.fingerprint !== fingerprint)
          conflict("This request key was already used with different input");
        return copy(previous.result);
      }
      const snapshot = state ? copy(state) : null;
      const priorReceipts = new Map(receipts);
      try {
        let result: CommandResult = {
          success: true,
          message: "Demo updated. No production records were changed.",
        };
        if (operation === "signIn") {
          const roles: Record<string, Role> = {
            "manager@example.invalid": "manager",
            "owner@example.invalid": "organization_admin",
            "admin@example.invalid": "platform_admin",
          };
          const role = roles[input.email?.trim().toLowerCase()];
          if (!role || input.password !== "demo-only")
            throw new ApiError(
              "Use a listed demo account and the demo-only password",
              401,
              "INVALID_DEMO_ACCOUNT",
            );
          state = createDemoFixtures(role);
          state.app.user.email = input.email.trim().toLowerCase();
          receipts.clear();
          result.redirectTo = "/dashboard";
        } else if (operation === "signOut") {
          state = null;
          receipts.clear();
          result.redirectTo = "/login";
        } else {
          const data = current(),
            p = data.pages;
          const rooms = p["/rooms"].floors.flatMap((f) => f.rooms);
          if (operation === "switchHostel") {
            const hostel = p["/hostels"].hostels.find(
              (h) => h.id === input.hostelId,
            );
            if (!hostel) invalid("Unknown demo property");
            data.app.scope.activeHostelId = hostel.id;
            p["/hostels"].activeHostelId = hostel.id;
          } else if (operation === "createOrganization") {
            const name = required(input, "name");
            if (name.length < 2) invalid("Enter a longer organization name");
            const slug =
              input.slug?.trim() ||
              name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            if (p["/organizations"].organizations.some((o) => o.slug === slug))
              conflict("That demo organization already exists");
            p["/organizations"].organizations.push({
              id: `demo-org-${crypto.randomUUID()}`,
              name,
              slug,
              status: "active",
              createdAt: new Date(),
              hostelCount: 0,
              residentCount: 0,
              billedPaise: 0,
              outstandingPaise: 0,
            });
          } else if (operation === "toggleOrganization") {
            const org = p["/organizations"].organizations.find(
              (o) => o.id === input.organizationId,
            );
            if (!org) invalid("Unknown organization");
            org.status = org.status === "active" ? "inactive" : "active";
          } else if (operation === "toggleManager") {
            const manager = p["/managers"].managers.find(
              (m) => m.bindingId === input.bindingId,
            );
            if (!manager) invalid("Unknown role assignment");
            manager.isActive = !manager.isActive;
          } else if (operation === "setBedStatus") {
            const bed = rooms
              .flatMap((r) => r.beds)
              .find((b) => b.id === input.bedId);
            if (!bed) invalid("Unknown bed");
            if (bed.status === "occupied" || bed.status === "blocked")
              conflict("Choose an available or maintenance bed");
            const status = input.targetStatus ?? input.status;
            if (status !== "in_service" && status !== "maintenance")
              invalid("Unsupported demo bed status");
            bed.operationalStatus = status;
            bed.status = status === "in_service" ? "available" : "maintenance";
          } else if (operation === "checkIn") {
            const name = required(input, "fullName"),
              phone = required(input, "phone"),
              start = required(input, "checkInDate");
            const started = date(start);
            const rent = money(input, "agreedRentPaise"),
              deposit = money(input, "agreedDepositPaise");
            const billingDay = Number(input.billingDay ?? "1");
            if (
              !Number.isInteger(billingDay) ||
              billingDay < 1 ||
              billingDay > 28
            )
              invalid("Billing day must be 1–28");
            const room = rooms.find((r) => r.id === input.roomId);
            const bed = room?.beds.find((b) => b.id === input.bedId);
            const plan = p["/check-ins"].ratePlans.find(
              (r) =>
                r.id === input.ratePlanId && r.roomTypeId === room?.roomTypeId,
            );
            if (!room || !bed || !plan)
              invalid("Select a room, available bed and matching plan");
            if (bed.status !== "available")
              conflict("That demo bed is no longer available");
            if (input.expectedEndDate && date(input.expectedEndDate) < started)
              invalid("Expected end must follow check-in");
            const id = `demo-resident-${crypto.randomUUID()}`;
            const detail: ResidentPage = {
              resident: {
                id,
                fullName: name,
                phone,
                email: input.email || null,
                gender: input.gender || "undisclosed",
                status: "active",
                createdAt: new Date(),
                roomNumber: room.roomNumber,
                bedLabel: bed.bedLabel,
                agreedRentPaise: rent,
                startDate: start,
                emergencyContactName: null,
                emergencyContactPhone: null,
                room: { id: room.id, roomNumber: room.roomNumber },
                bed: { id: bed.id, bedLabel: bed.bedLabel },
                activeAgreement: {
                  id: `demo-agreement-${id}`,
                  status: "active",
                  agreedRentPaise: rent,
                  agreedDepositPaise: deposit,
                  billingDay,
                  startDate: start,
                  expectedEndDate: input.expectedEndDate || null,
                  noticePeriodDays: 30,
                },
                ratePlan: { id: plan.id, name: plan.name },
              },
              location: {
                buildingName: room.buildingName,
                floorLabel: room.floorLabel,
              },
              invoices: [],
              payments: [],
              financialSummary: {
                totalBilledPaise: 0,
                totalPaidPaise: 0,
                totalOutstandingPaise: 0,
              },
              activityTimeline: [
                {
                  id: `demo-event-${id}`,
                  action: "resident.checked_in",
                  entityType: "resident",
                  createdAt: new Date(),
                  metadata: { simulation: true },
                },
              ],
            };
            data.residentDetails[id] = detail;
            bed.status = "occupied";
            bed.residentId = id;
            bed.residentName = name;
            result.resourceId = id;
            result.redirectTo = `/residents/${id}`;
          } else {
            const detail = data.residentDetails[required(input, "residentId")];
            if (!detail) invalid("Unknown demo resident");
            const resident = detail.resident;
            if (operation === "updateResident") {
              resident.fullName = required(input, "fullName");
              resident.phone = required(input, "phone");
              resident.email = input.email || null;
              resident.emergencyContactName =
                input.emergencyContactName || null;
              resident.emergencyContactPhone =
                input.emergencyContactPhone || null;
              for (const bed of rooms.flatMap((r) => r.beds))
                if (bed.residentId === resident.id)
                  bed.residentName = resident.fullName;
            } else if (operation === "checkOut") {
              const ended = date(required(input, "checkOutDate"));
              if (
                resident.status !== "active" ||
                !resident.activeAgreement ||
                !resident.room ||
                !resident.bed
              )
                conflict("This resident has no active demo stay");
              if (ended < date(resident.activeAgreement.startDate))
                invalid("Departure cannot precede arrival");
              p["/check-outs"].recentCheckouts.unshift({
                residentId: resident.id,
                residentName: resident.fullName,
                phone: resident.phone,
                roomNumber: resident.room.roomNumber,
                bedLabel: resident.bed.bedLabel,
                occupiedFrom: date(resident.activeAgreement.startDate),
                occupiedUntil: ended,
              });
              const bed = rooms
                .flatMap((r) => r.beds)
                .find((b) => b.id === resident.bed!.id);
              if (bed) {
                bed.status = "available";
                delete bed.residentId;
                delete bed.residentName;
              }
              resident.status = "checked_out";
              resident.activeAgreement = null;
              resident.room = null;
              resident.bed = null;
              resident.roomNumber = undefined;
              resident.bedLabel = undefined;
              detail.location = { buildingName: null, floorLabel: null };
            } else if (operation === "recordPayment") {
              const amount = money(input, "amountPaise");
              const invoice = detail.invoices.find(
                (i) => i.id === input.invoiceId,
              );
              if (!invoice) invalid("Choose a demo invoice for this resident");
              if (amount <= 0 || amount > invoice.outstandingPaise)
                invalid(
                  "Payment must be positive and no more than the outstanding balance",
                );
              const methods = ["cash", "upi", "bank_transfer", "card", "other"];
              if (!methods.includes(input.paymentMethod))
                invalid("Choose a supported payment method");
              invoice.paidPaise += amount;
              invoice.outstandingPaise -= amount;
              invoice.status = invoice.outstandingPaise
                ? "partially_paid"
                : "paid";
              detail.payments.unshift({
                id: `demo-payment-${crypto.randomUUID()}`,
                receivedAt: new Date(),
                paymentMethod: input.paymentMethod as "cash",
                reference: input.reference || null,
                amountPaise: amount,
                status: "succeeded",
                notes: input.notes || "Demo payment simulation",
              });
            } else invalid("Unsupported demo operation");
            detail.activityTimeline.unshift({
              id: `demo-event-${crypto.randomUUID()}`,
              action:
                operation === "recordPayment"
                  ? "payment.recorded"
                  : operation === "checkOut"
                    ? "resident.checked_out"
                    : "resident.updated",
              entityType: "resident",
              createdAt: new Date(),
              metadata: { residentName: resident.fullName, simulation: true },
            });
          }
          refresh();
        }
        receipts.set(idempotencyKey, { fingerprint, result });
        persist();
        return copy(result);
      } catch (error) {
        state = snapshot;
        receipts.clear();
        for (const [key, value] of priorReceipts) receipts.set(key, value);
        throw error;
      }
    },
  };
}
