import { expect, test } from "@playwright/test";

test.describe("portfolio story", () => {
  test("loads the Dev portfolio with all four chapters and no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
    await page.goto("/");
    await expect(page.locator("h1#intro-title")).toBeVisible();
    for (const id of ["mo-dau", "tech-stack", "du-an", "lien-he"]) await expect(page.locator(`#${id}`)).toHaveCount(1);
    await expect(page.locator(".loader")).toHaveCount(0, { timeout: 30_000 });
    expect(errors).toEqual([]);
  });

  test("switches to the Roblox portfolio from the header", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: /portfolio/i }).getByRole("link", { name: "Roblox" }).click();
    await expect(page).toHaveURL(/\/roblox$/);
    await expect(page.locator(".site[data-mode='roblox']")).toBeVisible();
  });

  test("toggles the interface language and remembers it", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Ngôn ngữ/ }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("h1#intro-title")).toContainText("Clean code.");
    await page.reload();
    await expect(page.locator("h1#intro-title")).toContainText("Clean code.");
    await page.getByRole("button", { name: /Language/ }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  });

  test("J moves to the next chapter", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard shortcut");
    await page.goto("/");
    await expect(page.locator(".loader")).toHaveCount(0, { timeout: 30_000 });
    await page.keyboard.press("j");
    await expect(page.locator(".chapter-rail [aria-current='step']")).toContainText("02", { timeout: 10_000 });
  });

  test("the header contact link lands on the seated sunset scene", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".loader")).toHaveCount(0, { timeout: 30_000 });
    await page.locator(".hud-header a[href='#lien-he']").click();
    await expect(page.locator(".chapter-rail [aria-current='step']")).toContainText("04", { timeout: 10_000 });
    // 093% = story 3.75: Sussy has sat down under the tree (the contact chapter starts while still running).
    await expect(page.locator(".hud-readout")).toContainText(/09\d%/, { timeout: 10_000 });
  });

  test("switching to Roblox at the last stop keeps the page alive", async ({ page }) => {
    // Regression: Dev has more techs than Roblox; the old focus index crashed the first Roblox render.
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.locator(".loader")).toHaveCount(0, { timeout: 30_000 });
    await page.locator(".hud-header a[href='#lien-he']").click();
    await expect(page.locator(".chapter-rail [aria-current='step']")).toContainText("04", { timeout: 10_000 });
    await page.getByRole("navigation", { name: /portfolio/i }).getByRole("link", { name: "Roblox" }).click();
    await expect(page).toHaveURL(/\/roblox$/);
    await expect(page.locator("#contact-title")).toBeVisible();
    await expect(page.locator(".mode-curtain")).not.toHaveClass(/is-active/);
    expect(errors).toEqual([]);
  });

  test("copy fades out before it slides under the fixed header", async ({ page }) => {
    const supported = await page.evaluate(() => CSS.supports("animation-timeline", "view()"));
    test.skip(!supported, "scroll-driven animations");
    await page.goto("/");
    // The title sits in a sticky block: scroll on until its top edge has passed under the header bar.
    const top = await page.evaluate(async () => {
      const title = document.getElementById("tech-title")!;
      for (let i = 0; i < 600 && title.getBoundingClientRect().top > 40; i++) {
        window.scrollBy(0, 40);
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      return title.getBoundingClientRect().top;
    });
    expect(top).toBeLessThanOrEqual(40);
    await expect
      .poll(async () => page.locator("#tech-title").evaluate((el) => Number(getComputedStyle(el).opacity)))
      .toBeLessThan(0.05);
    // Back in the middle of the view, it is fully visible again.
    await page.evaluate(async () => {
      const title = document.getElementById("tech-title")!;
      for (let i = 0; i < 600 && title.getBoundingClientRect().top < window.innerHeight * 0.35; i++) {
        window.scrollBy(0, -40);
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    });
    await expect
      .poll(async () => page.locator("#tech-title").evaluate((el) => Number(getComputedStyle(el).opacity)))
      .toBeGreaterThan(0.95);
  });

  test("has no horizontal overflow", async ({ page }) => {
    for (const path of ["/", "/roblox", "/nhat-ky", "/cv", "/du-an/sussy"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("secondary pages", () => {
  test("case study, changelog, CV and 404", async ({ page }) => {
    await page.goto("/du-an/portfolio-3d");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Portfolio 3D này");
    await page.goto("/nhat-ky");
    await expect(page.locator(".release").first()).toBeVisible();
    await page.goto("/cv");
    await expect(page.getByRole("button", { name: /In \/ Lưu PDF/ })).toBeVisible();
    const missing = await page.goto("/khong-ton-tai");
    expect(missing?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("lạc");
    // Favicon: Sussy's head with the trilby and glasses (app/icon.png); the loader uses the bare egg head.
    await expect(page.locator("link[rel='icon']")).toHaveAttribute("href", /\/icon\.png/);
    expect((await page.request.get((await page.locator("link[rel='icon']").getAttribute("href"))!)).headers()["content-type"]).toBe("image/png");
  });
});
