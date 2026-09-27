import { test, expect } from "@playwright/test";
import { createDemoFixtures } from "../../src/lib/api/fixtures";
import { encodeView } from "../../src/lib/api/transport";
test.use({ baseURL: "http://127.0.0.1:5181" });
test("live login has no demo switcher and outage never becomes demo data", async ({
  page,
}) => {
  await page.route("**/api/v1/**", (r) => r.abort());
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Demo Manager", exact: true }),
  ).toHaveCount(0);
  await page.goto("/dashboard");
  await expect(
    page.getByText(/No demo data has been substituted/).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Willow House Demo", { exact: true }),
  ).toHaveCount(0);
});
test("live view reads valid JSON and rejects malformed records without demo fallback", async ({
  page,
}) => {
  const fixtures = createDemoFixtures();
  await page.route("**/api/v1/session", (r) =>
    r.fulfill({ json: { data: { ...fixtures.app, csrfToken: "test-csrf" } } }),
  );
  await page.route("**/api/v1/views/dashboard", (r) =>
    r.fulfill({
      json: {
        data: encodeView({
          ...fixtures.pages["/dashboard"],
          managerData: {
            ...fixtures.pages["/dashboard"].managerData,
            hostelName: "External API Property",
          },
        }),
      },
    }),
  );
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "External API Property" }),
  ).toBeVisible();
  await page.route("**/api/v1/views/payments", (r) =>
    r.fulfill({ json: { data: { invoices: [{ id: "incomplete" }] } } }),
  );
  await page.goto("/payments");
  await expect(
    page.getByText(/does not match this screen/).first(),
  ).toBeVisible();
});
test("live mutation sends one exact JSON business request and keeps validation error visible", async ({
  page,
}) => {
  const fixtures = createDemoFixtures();
  let commands = 0;
  await page.route("**/api/v1/session", (r) =>
    r.fulfill({ json: { data: { ...fixtures.app, csrfToken: "test-csrf" } } }),
  );
  await page.route("**/api/v1/views/residents/demo-resident-a", (r) =>
    r.fulfill({
      json: { data: encodeView(fixtures.residentDetails["demo-resident-a"]) },
    }),
  );
  await page.route("**/api/v1/residents/demo-resident-a/profile", async (r) => {
    commands++;
    expect(r.request().method()).toBe("PATCH");
    expect(r.request().headers()["x-csrf-token"]).toBe("test-csrf");
    expect(r.request().headers()["idempotency-key"]).toBeTruthy();
    expect(r.request().postDataJSON()).toMatchObject({
      residentId: "demo-resident-a",
      fullName: "API Test Name",
    });
    await r.fulfill({
      status: 422,
      json: {
        error: {
          code: "VALIDATION_ERROR",
          message: "Backend rejected this sample phone",
          fields: { phone: "Invalid phone" },
        },
      },
    });
  });
  await page.goto("/residents/demo-resident-a");
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('[name="fullName"]').fill("API Test Name");
  await dialog.getByRole("button", { name: /Save/ }).click();
  await expect(dialog).toBeVisible();
  await expect(
    page
      .getByText("Backend rejected this sample phone", { exact: true })
      .first(),
  ).toBeVisible();
  expect(commands).toBe(1);
});
