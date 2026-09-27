/** Business operations. The backend owns authorization, validation and atomicity. */
export const operations = {
  signIn: { method: "POST", path: "/session", resource: false },
  signOut: { method: "DELETE", path: "/session", resource: false },
  switchHostel: {
    method: "POST",
    path: "/session/active-hostel",
    resource: false,
  },
  createOrganization: {
    method: "POST",
    path: "/hierarchy/partner",
    resource: false,
  },
  toggleOrganization: {
    method: "POST",
    path: "/organizations/status",
    resource: false,
  },
  toggleManager: { method: "POST", path: "/staff/access", resource: false },
  checkIn: { method: "POST", path: "/admissions", resource: false },
  checkOut: { method: "POST", path: "/departures", resource: false },
  updateResident: {
    method: "PATCH",
    path: "/residents/:id/profile",
    resource: true,
  },
  recordPayment: { method: "POST", path: "/payments", resource: false },
  setBedStatus: {
    method: "POST",
    path: "/inventory/bed-status",
    resource: false,
  },
} as const;
export type Operation = keyof typeof operations;
export type CommandInput = Record<string, string>;
export interface CommandResult {
  success: true;
  message: string;
  resourceId?: string;
  redirectTo?: string;
}
