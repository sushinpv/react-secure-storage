import { test as base, expect, type BrowserContext, type Page } from "@playwright/test";
import type { FixtureOptions } from "../../playwright.config";

const test = base.extend<FixtureOptions & { errors: string[] }>({
  fixture: ["vite", { option: true }],
  ssr: [false, { option: true }],
  prefix: ["@secure.", { option: true }],
  paths: [["/"], { option: true }],
  alg: ["AES-GCM", { option: true }],
  // Collect console errors and uncaught exceptions (hydration mismatches are reported as console errors)
  errors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("console", (msg) => (msg.type() === "error" || msg.text().startsWith("secure storage")) && errors.push(msg.text()));
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
const write = async (page: Page) => {
  await page.getByRole("button", { name: "write" }).click();
  await expect(page.getByTestId("values")).toHaveText(JSON.stringify(WRITTEN));
};
const storageEntries = (page: Page) => page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));

/** Record whether any loaded script contains the legacy cipher (the v1 fingerprint code) */
const trackLegacyChunk = (context: BrowserContext) => {
  const state = { loaded: false };
  context.on("response", async (response) => {
    if (response.request().resourceType() !== "script") return;
    const body = await response.text().catch(() => "");
    if (body.includes("ClientJS,org")) state.loaded = true;
  });
  return state;
};

test.describe("secure storage in a real app", () => {
  test("server HTML renders placeholders and the page hydrates without errors", async ({ page, request, paths, ssr, errors }) => {
    for (const path of paths) {
      if (ssr) {
        const response = await request.get(path);
        expect(response.status(), `GET ${path}`).toBe(200);
        const html = await response.text();
        expect(html).toContain('data-testid="status">loading<');
        expect(html).toContain('data-testid="counter">loading<');
      }
      await open(page, path);
      expect(await values(page)).toEqual(EMPTY);
    }
    expect(errors).toEqual([]);
  });

  test("values persist across reloads and server-rendered navigations", async ({ page, paths, errors }) => {
    await open(page, paths[0]);
    await write(page);
    for (const path of paths) {
      await open(page, path);
      expect(await values(page), `after loading ${path}`).toEqual(WRITTEN);
    }
    await page.reload();
    await expect(page.getByTestId("values")).toHaveText(JSON.stringify(WRITTEN));
    expect(errors).toEqual([]);
  });

  test("stores encrypted envelopes under <prefix>2.<key>", async ({ page, paths, prefix, alg }) => {
    await open(page, paths[0]);
    await write(page);
    const entries = await storageEntries(page);
    expect(Object.keys(entries).sort()).toEqual([`${prefix}2.flag`, `${prefix}2.number`, `${prefix}2.object`]);
    for (const raw of Object.values(entries)) {
      expect(JSON.parse(raw)).toMatchObject({ v: 2, alg });
      expect(raw).not.toContain("héllo");
    }
  });

  test("uses the expected cipher and loads crypto-js only for the fallback", async ({ context, page, paths, alg }) => {
    const legacy = trackLegacyChunk(context);
    await open(page, paths[0]);
    await write(page);
    await page.reload();
    await expect(page.getByTestId("values")).toHaveText(JSON.stringify(WRITTEN));
    const errors = JSON.parse((await page.getByTestId("errors").textContent()) ?? "[]");
    if (alg === "legacy") {
      expect(errors).toContain("fallback:null");
      expect(legacy.loaded).toBe(true);
    } else {
      expect(errors).toEqual([]);
      expect(legacy.loaded).toBe(false);
    }
  });

  test("removeItem removes one key; clear keeps keys the library does not own", async ({ page, paths, errors }) => {
    await open(page, paths[0]);
    await page.evaluate(() => localStorage.setItem("unrelated", "keep me"));
    await write(page);

    await page.getByRole("button", { name: "remove" }).click();
    await expect(page.getByTestId("values")).toHaveText(JSON.stringify({ ...WRITTEN, object: null }));

    await page.getByRole("button", { name: "clear" }).click();
    await expect(page.getByTestId("values")).toHaveText(JSON.stringify(EMPTY));
    expect(Object.keys(await storageEntries(page))).toEqual(["unrelated"]);
    expect(errors).toEqual([]);
  });

  test("sync entry reads the stored value after ready()", async ({ page, paths }) => {
    await open(page, paths[0]);
    await write(page);
    await expect(page.getByTestId("sync-number")).toHaveText("42");
    await page.reload();
    await expect(page.getByTestId("sync-number")).toHaveText("42");
  });

  test("useSecureStorage: loading on the server, stored value after hydration", async ({ page, paths, errors }) => {
    await open(page, paths[0]);
    await expect(page.getByTestId("counter")).toHaveText("0");
    await page.getByRole("button", { name: "increment" }).click();
    await page.getByRole("button", { name: "increment" }).click();
    await expect(page.getByTestId("counter")).toHaveText("2");

    for (const path of paths) {
      await open(page, path);
      await expect(page.getByTestId("counter"), `after loading ${path}`).toHaveText("2");
    }
    await page.getByRole("button", { name: "reset counter" }).click();
    await expect(page.getByTestId("counter")).toHaveText("0");
    expect(errors).toEqual([]);
  });

  test("changes in one tab appear in another tab without a reload", async ({ context, paths }) => {
    const tabA = await context.newPage();
    const tabB = await context.newPage();
    for (const tab of [tabA, tabB]) await open(tab, paths[0]);
    await expect(tabB.getByTestId("counter")).toHaveText("0");

    await tabA.getByRole("button", { name: "increment" }).click();
    await expect(tabB.getByTestId("counter")).toHaveText("1");
    await tabB.getByRole("button", { name: "increment" }).click();
    await expect(tabA.getByTestId("counter")).toHaveText("2");

    await tabA.getByRole("button", { name: "write" }).click();
    await expect(tabB.getByTestId("sync-number")).toHaveText("42");

    await tabA.getByRole("button", { name: "clear" }).click();
    await expect(tabB.getByTestId("counter")).toHaveText("0");
    await expect(tabB.getByTestId("sync-number")).toHaveText("null");
  });

  test("values copied into another browser profile can't be decrypted", async ({ browser, page, paths, alg, baseURL }) => {
    test.skip(alg === "legacy", "the fallback key is derived from the browser, not stored in the profile");
    await open(page, paths[0]);
    await write(page);
    const copied = await storageEntries(page);

    const otherProfile = await browser.newContext({ baseURL });
    await otherProfile.addInitScript((entries) => {
      if (!sessionStorage.getItem("seeded")) {
        Object.entries(entries).forEach(([k, v]) => localStorage.setItem(k, v as string));
        sessionStorage.setItem("seeded", "1");
      }
    }, copied);
    const other = await otherProfile.newPage();
    await open(other, paths[0]);
    expect(await values(other)).toEqual(EMPTY);
    const errors = JSON.parse((await other.getByTestId("errors").textContent()) ?? "[]");
    expect(errors).toEqual(expect.arrayContaining(["decrypt:object", "decrypt:number", "decrypt:flag"]));
    await otherProfile.close();
  });

  test("library calls made on the server are safe no-ops", async ({ request, fixture }) => {
    test.skip(fixture === "vite", "client-only app");
    const path = fixture === "next" ? "/server-call" : "/";
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(await response.text()).toMatch(/data-testid="server-result">server value: (<!-- -->)?null</);
  });
});
