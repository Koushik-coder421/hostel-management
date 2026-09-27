import { config } from "./config";
import { createHttp } from "./http";
import { ApiError } from "./errors";
import { decodeView } from "./transport";
import {
  operations,
  type Operation,
  type CommandInput,
  type CommandResult,
} from "./operations";
import type { AppData, PageDataMap, Role } from "./contracts";
import { validateSession, validatePage } from "./validate";
const http = createHttp(config);
// The demo implementation is never selected as recovery for a live API error.
const demo =
  config.mode === "demo"
    ? import("./demo").then((module) => module.createDemoAdapter())
    : null;
export const api = {
  async getSession(fetcher?: typeof fetch): Promise<AppData | null> {
    if (demo) return (await demo).getSession();
    try {
      const raw = await http.request("/session", { fetcher });
      if (!raw) {
        http.setAuthToken();
        return null;
      }
      const sessionRaw = raw as any;
      if (sessionRaw && typeof sessionRaw === "object") {
        if (!sessionRaw.csrfToken) {
          sessionRaw.csrfToken = http.getAuthToken() || "active-token";
        }
        if (!sessionRaw.hostels) {
          sessionRaw.hostels = [];
        }
        if (sessionRaw.user && sessionRaw.user.image === undefined) {
          sessionRaw.user.image = null;
        }
      }
      validateSession(sessionRaw);
      http.setAuthToken(sessionRaw.csrfToken || sessionRaw.token);
      return sessionRaw as AppData;
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        http.setAuthToken();
        return null;
      }
      throw cause;
    }
  },
  async readView<K extends keyof PageDataMap>(
    route: K,
    params: Record<string, string> = {},
    fetcher?: typeof fetch,
  ): Promise<PageDataMap[K]> {
    if (demo) return (await demo).readView(route, params);

    if (route === "/dashboard") {
      const res = (await http.request("/hierarchy/dashboard", { fetcher })) as any;
      const roleStr = res.role || "SUPERADMIN";
      const metrics = res.metrics || {};
      const partnersList = res.partners || [];
      const hostelsList = res.hostels || [];

      let mappedRole: Role = "platform_admin";
      if (roleStr === "PARTNER") mappedRole = "organization_admin";
      else if (roleStr === "MANAGER" || roleStr === "SUPERVISOR") mappedRole = "manager";

      const platformData = {
        activeOrganizations: Number(metrics.total_partners || partnersList.length || 0),
        activeHostels: Number(metrics.total_hostels || 0),
        activeResidents: Number(metrics.total_tenants || 0),
        currentMonthBilledPaise: String(Math.round(Number(metrics.total_revenue || 0) * 100)),
        currentMonthCollectedPaise: String(Math.round(Number(metrics.total_revenue || 0) * 100)),
        totalOutstandingPaise: "0",
        totalOverduePaise: "0",
        overdueInvoicesCount: 0,
        organizations: partnersList.map((p: any) => ({
          id: String(p.partner_id),
          name: p.name || `Partner #${p.partner_id}`,
          hostelCount: Number(p.hostel_count || 0),
          residentCount: Number(p.manager_count || 0),
          billedPaise: "0",
          outstandingPaise: "0",
          overduePaise: "0"
        }))
      };

      const orgData = roleStr === "PARTNER" ? {
        organizationName: "Partner Portfolio",
        hostelCount: Number(metrics.total_hostels || hostelsList.length || 0),
        totalResidents: 0,
        physicalBeds: Number(metrics.total_beds || 0),
        sellableBeds: Number(metrics.total_beds || 0),
        occupiedBeds: Number(metrics.occupied_beds || 0),
        availableBeds: Number(metrics.total_beds || 0) - Number(metrics.occupied_beds || 0),
        occupancyRate: Number(parseFloat(metrics.occupancy_rate || "0")),
        currentMonthBilledPaise: String(Math.round(Number(metrics.total_revenue || 0) * 100)),
        currentMonthCollectedPaise: String(Math.round(Number(metrics.total_revenue || 0) * 100)),
        totalOutstandingPaise: "0",
        totalOverduePaise: "0",
        hostels: hostelsList.map((h: any) => ({
          id: String(h.hostel_id),
          name: h.name,
          city: h.address || "-",
          residentCount: 0,
          physicalBeds: 0,
          sellableBeds: 0,
          occupiedBeds: 0,
          availableBeds: 0,
          occupancyRate: 0,
          outstandingPaise: 0
        }))
      } : null;

      return {
        role: mappedRole,
        platformData: roleStr === "PARTNER" ? null : platformData,
        orgData: roleStr === "PARTNER" ? orgData : null,
        managerData: null
      } as any;
    }

    if (route === "/organizations") {
      const res = (await http.request("/hierarchy/partners", { fetcher })) as any;
      const list = Array.isArray(res) ? res : res?.data || [];
      const organizations = list.map((p: any) => ({
        id: String(p.partner_id),
        name: p.name || `Partner #${p.partner_id}`,
        slug: p.email ? p.email.split("@")[0] : `partner-${p.partner_id}`,
        status: p.is_active ? "active" : "inactive",
        createdAt: new Date(),
        hostelCount: Number(p.hostel_count || 0),
        residentCount: Number(p.manager_count || 0),
        billedPaise: 0,
        outstandingPaise: 0
      }));
      return { organizations } as any;
    }

    if (route === "/hostels") {
      const res = (await http.request("/hostels", { fetcher })) as any;
      const list = Array.isArray(res) ? res : res?.data || [];
      const hostels = list.map((h: any) => ({
        id: String(h.hostel_id),
        name: h.name || `Hostel #${h.hostel_id}`,
        code: h.hostel_code || `HSTL-${h.hostel_id}`,
        city: h.address || "-",
        addressLine1: h.address || "",
        isActive: h.status === "ACTIVE",
        status: h.status ? h.status.toLowerCase() : "active",
        occupancyRate: 0,
        occupiedBeds: 0,
        sellableBeds: 0,
        availableBeds: 0,
        residentCount: 0,
        physicalBeds: 0
      }));
      return { hostels } as any;
    }

    if (route === "/managers") {
      const res = (await http.request("/hierarchy/managers", { fetcher })) as any;
      const list = Array.isArray(res) ? res : res?.data || [];
      const managers = list.map((m: any) => ({
        bindingId: String(m.manager_id),
        name: m.name || `Manager #${m.manager_id}`,
        email: m.email || "-",
        role: "manager",
        orgName: m.partner_name || "Unassigned",
        hostelName: m.hostel_name || "Unassigned",
        isActive: m.is_active !== false,
        canManage: true
      }));
      return { managers } as any;
    }

    const path = route.replace(":id", encodeURIComponent(params.id ?? ""));
    const query = new URLSearchParams(
      Object.entries(params).filter(([key]) => key !== "id"),
    ).toString();
    const raw = await http.request(`/views${path}${query ? `?${query}` : ""}`, {
      fetcher,
    });
    validatePage(route, raw);
    return decodeView(raw) as PageDataMap[K];
  },
  async command(
    operation: Operation,
    input: CommandInput,
    idempotencyKey: string,
  ): Promise<CommandResult> {
    if (demo) return (await demo).command(operation, input, idempotencyKey);
    const descriptor = operations[operation];
    if (!descriptor)
      throw new ApiError("Unsupported action", 400, "UNSUPPORTED_OPERATION");
    const path = descriptor.path.replace(
      ":id",
      encodeURIComponent(input.residentId ?? ""),
    );
    const raw = await http.request(path, {
      method: descriptor.method,
      body: input,
      idempotencyKey,
      login: operation === "signIn",
    });

    if (operation === "signOut") {
      http.setAuthToken();
      return { success: true, message: "Signed out" };
    }

    const resObj = (raw || {}) as any;
    if (operation === "signIn" && resObj && typeof resObj === "object") {
      const token = resObj.token || resObj.csrfToken;
      if (token) {
        http.setAuthToken(token);
      }
      if (!resObj.success) resObj.success = true;
      if (!resObj.message) resObj.message = "Login successful";
    }

    if (
      !resObj ||
      typeof resObj !== "object" ||
      resObj.success !== true ||
      typeof resObj.message !== "string"
    ) {
      throw new ApiError(
        "Command response is invalid",
        502,
        "INVALID_RESPONSE",
      );
    }

    if (operation === "signIn") {
      if (!(await api.getSession()))
        throw new ApiError(
          "Login did not establish a session",
          401,
          "SESSION_REQUIRED",
        );
    }

    return resObj as CommandResult;
  },
};
