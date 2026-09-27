import { test, expect, type Page } from "@playwright/test";
async function login(page: Page, role = "Manager") {
  await page.goto("/login");
  await page.getByRole("button", { name: `Demo ${role}`, exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
test("demo login, every screen and deep-link reload need no backend", async ({
  page,
}) => {
  const errors: string[] = [];
  const apiRequests: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api/"))
      apiRequests.push(r.url());
  });
  await login(page);
  for (const route of [
    "/rooms",
    "/residents",
    "/residents/demo-resident-a",
    "/check-ins",
    "/check-outs",
    "/payments",
    "/reports",
    "/settings",
  ]) {
    await page.goto(route);
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.getByText("Demo mode", { exact: true })).toBeVisible();
    await expect(
      page.getByText("This page could not be loaded", { exact: true }),
    ).not.toBeVisible();
  }
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  expect(apiRequests).toEqual([]);
  await page.getByRole("button", { name: "Sign Out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/rooms");
  await expect(page).toHaveURL(/\/login\?redirectTo=/);
});
test("owner and platform views use their synthetic account context", async ({
  page,
}) => {
  await login(page, "Owner");
  for (const route of ["/hostels", "/managers", "/organizations"]) {
    await page.goto(route);
    await expect(page.locator("h1").first()).toBeVisible();
  }
  await page.goto("/settings");
  await page.getByRole("button", { name: "Sign Out", exact: true }).click();
  await login(page, "Platform Admin");
  await expect(
    page.getByRole("heading", { name: "Platform Overview" }),
  ).toBeVisible();
  await page.goto("/organizations");
  await expect(
    page.getByText("Willow Living Demo", { exact: true }),
  ).toBeVisible();
});
test("profile edit and payment are simulated and remain visible on reload", async ({
  page,
}) => {
  await login(page);
  await page.goto("/residents/demo-resident-a");
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('[name="fullName"]').fill("Updated Demo Resident");
  await dialog.getByRole("button", { name: /Save/ }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Updated Demo Resident" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Record payment", exact: true })
    .first()
    .click();
  await dialog.locator('[name="amountRupees"]').fill("0.29");
  await dialog
    .getByRole("button", {
      name: /Record payment|Confirm payment|Save payment/i,
    })
    .click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Updated Demo Resident" }),
  ).toBeVisible();
  await expect(
    page.getByText("₹3,999.71", { exact: true }).first(),
  ).toBeVisible();
});
test("mobile core routes fit 390px without document overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  for (const route of [
    "/dashboard",
    "/rooms",
    "/residents",
    "/check-ins",
    "/check-outs",
    "/payments",
    "/reports",
    "/settings",
  ]) {
    await page.goto(route);
    await expect(page.locator("h1").first()).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
      route,
    ).toBeLessThanOrEqual(0);
  }
});

test('admission and departure work through the preserved native UI', async ({ page }) => {
  await login(page);
  await page.goto('/check-ins');
  await page.locator('[name="fullName"]').fill('New Synthetic Resident');
  await page.locator('[name="phone"]').fill('0000000088');
  await page.getByRole('combobox', { name: 'Room Required', exact: true }).click();
  await page.getByRole('option', { name: /Room 103/ }).click();
  await page.getByRole('combobox', { name: 'Bed Required', exact: true }).click();
  await page.getByRole('option', { name: 'A', exact: true }).click();
  await page.getByRole('combobox', { name: 'Rate Plan Required', exact: true }).click();
  await page.getByRole('option', { name: /Twin monthly/ }).click();
  const date = page.locator('input[name="checkInDate"]');
  await date.fill('2026-09-20');
  expect((await date.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.getByRole('button', { name: 'Complete Check-In', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'New Synthetic Resident' })).toBeVisible();
  await page.getByRole('button', { name: 'Check out', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[name="checkOutDate"]').fill('2026-09-23');
  await dialog.getByRole('button', { name: /Confirm check.?out/i }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText('Checked out', { exact: true }).first()).toBeVisible();
});
