import { test as base, expect, type Page } from "@playwright/test";
import type { FixtureOptions } from "../../playwright.config";

const test = base.extend<FixtureOptions & { errors: string[] }>({
  fixture: ["vite", { option: true }],
  ssr: [false, { option: true }],
  prefix: ["@secure.", { option: true }],
  paths: [["/"], { option: true }],
  // Collect console errors and uncaught exceptions (hydration mismatches are reported as console errors)
  errors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));
    page.on("pageerror", (err) => errors.push(err.message));
    await use(errors);
  },
});

const WRITTEN = { object: { text: "héllo", list: [1, 2] }, number: 42, flag: true };
const EMPTY = { object: null, number: null, flag: null };

const open = async (page: Page, path: string) => {
  await page.goto(path);
  await expect(page.getByTestId("status")).toHaveText("hydrated");
};
const values = async (page: Page) => JSON.parse((await page.getByTestId("values").textContent()) ?? "null");
const storageKeys = (page: Page) => page.evaluate(() => Object.keys(localStorage).sort());

test.describe("secure storage in a real app", () => {
  test("server HTML renders the placeholder and the page hydrates without errors", async ({ page, request, paths, ssr, errors }) => {
    for (const path of paths) {
      const response = await request.get(path);
      expect(response.status(), `GET ${path}`).toBe(200);
      if (ssr) expect(await response.text()).toContain('data-testid="status">loading<');

      await open(page, path);
      expect(await values(page)).toEqual(EMPTY);
    }
    expect(errors).toEqual([]);
  });

  test("values persist across reloads and server-rendered navigations", async ({ page, paths, errors }) => {
    await open(page, paths[0]);
    await page.getByRole("button", { name: "write" }).click();
    expect(await values(page)).toEqual(WRITTEN);

    for (const path of paths) {
      await open(page, path);
      expect(await values(page), `after loading ${path}`).toEqual(WRITTEN);
    }
    await page.reload();
    await expect(page.getByTestId("status")).toHaveText("hydrated");
    expect(await values(page)).toEqual(WRITTEN);
    expect(errors).toEqual([]);
  });

  test("stores encrypted values under the configured prefix", async ({ page, paths, prefix }) => {
    await open(page, paths[0]);
    await page.getByRole("button", { name: "write" }).click();

    expect(await storageKeys(page)).toEqual([`${prefix}b.flag`, `${prefix}j.object`, `${prefix}n.number`].sort());
    const raw = await page.evaluate(() => Object.values(localStorage).join(" "));
    expect(raw).not.toContain("héllo");
  });

  test("removeItem removes one key; clear keeps keys the library does not own", async ({ page, paths, errors }) => {
    await open(page, paths[0]);
    await page.evaluate(() => localStorage.setItem("unrelated", "keep me"));
    await page.getByRole("button", { name: "write" }).click();

    await page.getByRole("button", { name: "remove" }).click();
    expect(await values(page)).toEqual({ ...WRITTEN, object: null });

    await page.getByRole("button", { name: "clear" }).click();
    expect(await values(page)).toEqual(EMPTY);
    expect(await storageKeys(page)).toEqual(["unrelated"]);

    await page.reload();
    await expect(page.getByTestId("status")).toHaveText("hydrated");
    expect(await values(page)).toEqual(EMPTY);
    expect(errors).toEqual([]);
  });

  test("library calls made on the server are safe no-ops", async ({ request, fixture }) => {
    test.skip(fixture === "vite", "client-only app");
    const path = fixture === "next" ? "/server-call" : "/";
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(await response.text()).toMatch(/data-testid="server-result">server value: (<!-- -->)?null</);
  });
});
