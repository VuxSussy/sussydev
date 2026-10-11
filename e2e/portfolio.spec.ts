import { expect, test } from "@playwright/test";

test.describe("portfolio story", () => {
  test("loads the portfolio with all four chapters and no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
    await page.goto("/");
    await expect(page.locator("h1#intro-title")).toBeVisible();
    for (const id of ["mo-dau", "tech-stack", "du-an", "lien-he"]) await expect(page.locator(`#${id}`)).toHaveCount(1);
    await expect(page.locator(".loader")).toHaveCount(0, { timeout: 30_000 });
    expect(errors).toEqual([]);
  });

  test("the old /roblox link lands on the merged Roblox developer portfolio", async ({ page }) => {
    await page.goto("/roblox");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("h1#intro-title")).toContainText("Dựng map.");
    await expect(page.locator(".mode-switch")).toHaveCount(0);
  });

  test("the loader rolls in the bottom-right corner for a few seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/");
    const corner = page.locator(".loader-corner");
    await expect(corner).toBeVisible();
    const box = (await corner.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.x + box.width).toBeGreaterThan(viewport.width * 0.85);
    expect(box.y + box.height).toBeGreaterThan(viewport.height * 0.85);
    await expect(page.locator(".loader")).toHaveCount(0, { timeout: 30_000 });
    expect(Date.now() - start).toBeGreaterThan(3500);
  });

  test("toggles the interface language and remembers it", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Ngôn ngữ/ }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("h1#intro-title")).toContainText("Build maps.");
    await page.reload();
    await expect(page.locator("h1#intro-title")).toContainText("Build maps.");
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

  test("groups the tech chips into Language, Framework and Tool", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".loader")).toHaveCount(0, { timeout: 30_000 });
    const chips = page.locator("#tech-stack .tech-chips");
    for (const [name, first] of [["Ngôn ngữ", "Luau"], ["Framework", "Roblox"], ["Công cụ", "Roblox Studio"]]) {
      await expect(chips.getByRole("group", { name }).getByRole("button").first()).toHaveText(first);
    }
    await chips.getByRole("group", { name: "Công cụ" }).getByRole("button", { name: "Blender" }).click();
    await expect(page.locator(".tech-caption .tech-name")).toHaveText("Blender", { timeout: 10_000 });
    await expect(page.locator(".tech-caption .tech-kind")).toHaveText("Công cụ");
  });

  test("the header contact link lands on the seated sunset scene", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".loader")).toHaveCount(0, { timeout: 30_000 });
    await page.locator(".hud-header a[href='#lien-he']").click();
    await expect(page.locator(".chapter-rail [aria-current='step']")).toContainText("04", { timeout: 10_000 });
    // 093% = story 3.75: Sussy has sat down under the tree (the contact chapter starts while still running).
    await expect(page.locator(".hud-readout")).toContainText(/09\d%/, { timeout: 10_000 });
  });

  test("the project panel follows Sussy from one roadside TV to the next", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".loader")).toHaveCount(0, { timeout: 30_000 });
    const panel = page.locator(".showcase-panel");
    const stops = page.locator(".showcase-stops li");
    const count = await stops.count();
    expect(count).toBeGreaterThan(1);
    const titles: string[] = [];
    for (let i = 0; i < count; i++) {
      // Put stop i on the viewport's centre line, where the story value is read.
      await stops.nth(i).evaluate((el) => { const r = el.getBoundingClientRect(); window.scrollBy(0, r.top + r.height / 2 - window.innerHeight / 2); });
      await expect(panel.locator(".showcase-dots button").nth(i)).toHaveAttribute("aria-current", "true");
      await expect(panel).toBeInViewport();
      titles.push((await panel.locator("h3").textContent()) ?? "");
    }
    expect(new Set(titles).size).toBe(count);
    // The dots jump back to the first project.
    await panel.locator(".showcase-dots button").first().click();
    await expect(panel.locator("h3")).toHaveText(titles[0], { timeout: 10_000 });
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
    for (const path of ["/", "/nhat-ky", "/cv", "/du-an/sussy"]) {
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
