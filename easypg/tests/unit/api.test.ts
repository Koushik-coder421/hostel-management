import { describe, it, expect, vi } from "vitest";
import { parseConfig } from "../../src/lib/api/config";
import {
  decodeView,
  encodeView,
  rupeesToWire,
} from "../../src/lib/api/transport";
import { createHttp } from "../../src/lib/api/http";
import { createDemoFixtures } from "../../src/lib/api/fixtures";
import { createDemoAdapter } from "../../src/lib/api/demo";
import { validatePage, validateSession } from "../../src/lib/api/validate";
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
describe("Explicit frontend boundary", () => {
  it("defaults to demo and rejects mode typos", () => {
    expect(parseConfig(undefined).mode).toBe("demo");
    expect(() => parseConfig("production")).toThrow();
  });
  it("rejects protocol-relative API base URLs", () => {
    expect(() => parseConfig("live", "//untrusted.example")).toThrow();
  });
  it("parses rupees exactly and rejects excess precision", () => {
    expect(rupeesToWire("0.29")).toBe("29");
    expect(rupeesToWire("90071992547409.93")).toBe("9007199254740993");
    expect(() => rupeesToWire("1.001")).toThrow();
  });
  it("does not truncate amounts beyond the supported presentation range", () => {
    expect(() => decodeView({ totalPaise: "9007199254740993" })).toThrow(
      /range/,
    );
    expect(() => decodeView({ totalPaise: 12 })).toThrow();
  });
  it("restores dates and numeric display amounts from JSON only", () => {
    const original = {
      createdAt: new Date("2026-09-01T00:00:00+05:30"),
      amountPaise: 29,
    };
    expect(decodeView(encodeView(original))).toEqual(original);
  });
  it("validates every fixture view against the wire contract", () => {
    const fixtures = createDemoFixtures();
    for (const [route, view] of Object.entries(fixtures.pages))
      expect(() =>
        validatePage(route as keyof typeof fixtures.pages, encodeView(view)),
      ).not.toThrow();
  });
  it("rejects malformed nested live records", () => {
    expect(() =>
      validatePage("/payments", { invoices: [{ id: "incomplete" }] }),
    ).toThrow();
  });
  it("requires a live CSRF token and valid app context", () => {
    expect(() => validateSession(createDemoFixtures().app)).toThrow();
    expect(() =>
      validateSession({
        ...createDemoFixtures().app,
        csrfToken: "sample-token",
      }),
    ).not.toThrow();
  });
  it("sends live credentials and idempotency and CSRF headers", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(response({ success: true, message: "ok" }));
    const http = createHttp(parseConfig("live"), fetcher);
    http.setCsrfToken("csrf");
    await http.request("/payments", {
      method: "POST",
      body: { amountPaise: "29" },
      idempotencyKey: "retry-key",
    });
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      credentials: "include",
      headers: { "X-CSRF-Token": "csrf", "Idempotency-Key": "retry-key" },
      body: '{"amountPaise":"29"}',
    });
  });
  it("fails closed without a session on mutations", async () => {
    const fetcher = vi.fn();
    const http = createHttp(parseConfig("live"), fetcher);
    await expect(
      http.request("/payments", { method: "POST" }),
    ).rejects.toMatchObject({ status: 401 });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("reports unavailable live API without recovery data", async () => {
    const http = createHttp(
      parseConfig("live"),
      vi.fn().mockRejectedValue(new Error("offline")),
    );
    await expect(http.request("/session")).rejects.toThrow(/No demo data/);
  });
  it("preserves backend conflict status and request details", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "BED_UNAVAILABLE",
              message: "Bed is occupied",
              requestId: "req-1",
            },
          }),
          { status: 409, headers: { "Content-Type": "application/json" } },
        ),
      );
    const http = createHttp(parseConfig("live"), fetcher);
    await expect(http.request("/views/rooms")).rejects.toMatchObject({
      status: 409,
      code: "BED_UNAVAILABLE",
      requestId: "req-1",
    });
  });
  it("rejects a static fallback HTML response from a wrongly routed API", async () => {
    const http = createHttp(
      parseConfig("live"),
      vi
        .fn()
        .mockResolvedValue(
          new Response("<html/>", { headers: { "Content-Type": "text/html" } }),
        ),
    );
    await expect(http.request("/session")).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });
});
describe("Demo scenario adapter (not backend enforcement)", () => {
  async function loggedIn() {
    const demo = createDemoAdapter();
    await demo.command(
      "signIn",
      { email: "manager@example.invalid", password: "demo-only" },
      crypto.randomUUID(),
    );
    return demo;
  }
  it("starts unauthenticated", async () => {
    expect(await createDemoAdapter().getSession()).toBeNull();
  });
  it("accepts only explicitly synthetic identities", async () => {
    await expect(
      createDemoAdapter().command(
        "signIn",
        { email: "real@example.com", password: "anything" },
        "sign-in",
      ),
    ).rejects.toMatchObject({ status: 401 });
  });
  it("keeps a payment visible across views and makes a retry idempotent", async () => {
    const demo = await loggedIn();
    const input = {
      residentId: "demo-resident-a",
      invoiceId: "demo-invoice-1",
      amountPaise: "29",
      paymentMethod: "upi",
    };
    await demo.command("recordPayment", input, "payment-key");
    await demo.command("recordPayment", input, "payment-key");
    const view = await demo.readView("/payments");
    expect(view.invoices[0].outstandingPaise).toBe(399971);
    const detail = await demo.readView("/residents/:id", {
      id: "demo-resident-a",
    });
    expect(detail.payments[0].amountPaise).toBe(29);
    expect(detail.financialSummary.totalOutstandingPaise).toBe(399971);
  });
  it("rejects reuse of an idempotency key with different input", async () => {
    const demo = await loggedIn();
    await demo.command(
      "setBedStatus",
      { bedId: "demo-bed-3-b", targetStatus: "in_service" },
      "key",
    );
    await expect(
      demo.command(
        "setBedStatus",
        { bedId: "demo-bed-3-b", targetStatus: "maintenance" },
        "key",
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("shows a simulated arrival then departure across inventory and directory", async () => {
    const demo = await loggedIn();
    const result = await demo.command(
      "checkIn",
      {
        fullName: "Synthetic Visitor",
        phone: "0000000099",
        roomId: "demo-room-3",
        bedId: "demo-bed-3-a",
        ratePlanId: "demo-rate-plan",
        agreedRentPaise: "900000",
        agreedDepositPaise: "1800000",
        billingDay: "5",
        checkInDate: "2026-09-20",
      },
      "arrival",
    );
    expect(result.resourceId).toBeTruthy();
    expect((await demo.readView("/rooms")).stats.occupiedBeds).toBe(3);
    await demo.command(
      "checkOut",
      { residentId: result.resourceId!, checkOutDate: "2026-09-23" },
      "departure",
    );
    expect((await demo.readView("/rooms")).stats.occupiedBeds).toBe(2);
    expect(
      (await demo.readView("/residents/:id", { id: result.resourceId! }))
        .resident.status,
    ).toBe("checked_out");
  });
  it("does not mutate occupancy after invalid demo input", async () => {
    const demo = await loggedIn();
    const before = await demo.readView("/rooms");
    await expect(
      demo.command(
        "checkIn",
        {
          fullName: "Synthetic",
          phone: "0000000099",
          roomId: "demo-room-3",
          bedId: "demo-bed-3-a",
          ratePlanId: "demo-rate-plan",
          agreedRentPaise: "900000",
          agreedDepositPaise: "1800000",
          billingDay: "99",
          checkInDate: "2026-09-20",
        },
        "bad-arrival",
      ),
    ).rejects.toThrow();
    expect(await demo.readView("/rooms")).toEqual(before);
  });
  it("clears demo session on logout", async () => {
    const demo = await loggedIn();
    await demo.command("signOut", {}, "logout");
    expect(await demo.getSession()).toBeNull();
  });
});
