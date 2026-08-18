import { expect, test } from "@playwright/test"

test("admin sidebar exposes every section", async ({ page }) => {
  await page.goto("/en/admin")
  await expect(
    page.getByRole("heading", { name: "Learning operations" })
  ).toBeVisible({ timeout: 15_000 })

  const tabs = page.getByRole("tab")
  await expect(tabs).toHaveCount(5)

  for (const tab of await tabs.all()) {
    await expect(tab).toBeVisible()
  }

  await page.getByRole("tab", { name: "Content", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "Content library" })
  ).toBeVisible()
})

test("language switch keeps the current page", async ({ page }) => {
  await page.goto("/ar/admin")
  const languageSwitch = page.getByRole("button", {
    name: "English",
    exact: true,
  })
  await expect(languageSwitch).toBeVisible({ timeout: 15_000 })

  await languageSwitch.click()

  await expect(page).toHaveURL(/\/en\/admin$/)
  await expect(
    page.getByRole("heading", { name: "Learning operations" })
  ).toBeVisible({ timeout: 15_000 })
})

test("mobile admin navigation opens from a sheet", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 })
  await page.goto("/en/admin")

  const adminMenu = page.getByRole("button", {
    name: "Admin menu",
    exact: true,
  })
  await expect(adminMenu).toBeVisible({ timeout: 15_000 })
  await adminMenu.click()

  const navigation = page.getByRole("navigation", { name: "Admin menu" })
  await navigation.getByRole("button", { name: "Content" }).click()

  await expect(
    page.getByRole("heading", { name: "Content library" })
  ).toBeVisible()
  await expect(navigation).toBeHidden()
})

test("admin media workflow exposes static HLS and legacy Mux inputs", async ({
  page,
}) => {
  await page.goto("/en/admin")
  await page.getByRole("tab", { name: "Media inbox" }).click()

  await page.getByRole("button", { name: "Add video" }).first().click()
  const dialog = page.getByRole("dialog", { name: "Curriculum and video" })
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByRole("button", { name: "Static HLS package" })
  ).toHaveAttribute("aria-pressed", "true")
  await expect(dialog.getByLabel("Relative master playlist path")).toBeVisible()
  await expect(dialog.getByLabel("English captions")).toBeVisible()
  await expect(dialog.getByLabel("Arabic captions")).toBeVisible()

  await dialog.getByRole("button", { name: "Mux upload" }).click()
  await expect(dialog.getByLabel("Video file")).toBeVisible()
  await expect(dialog.getByLabel("Relative master playlist path")).toHaveCount(
    0
  )
})

test("public navigation and course metadata avoid redundant labels", async ({
  page,
}) => {
  await page.goto("/en")

  const primaryNavigation = page.getByRole("navigation", {
    name: "Primary navigation",
  })
  await expect(
    primaryNavigation.getByText("Admin", { exact: true })
  ).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: "Browse learning" })
  ).toHaveCount(1)
  await expect(
    page.getByRole("button", { name: "Explore catalog" })
  ).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: "View course" }).first()
  ).toBeVisible({ timeout: 15_000 })

  const featuredSeries = page
    .getByRole("group")
    .filter({ hasText: "Web Foundations" })
    .first()
  await expect(
    featuredSeries.getByText("Arabic", { exact: true })
  ).toBeVisible()

  await page.goto("/en/courses/git-without-fear")
  await expect(page.getByText("Completely free", { exact: true })).toHaveCount(
    0
  )
  await expect(page.getByText("1 Lesson", { exact: true })).toHaveCount(0)
  await expect(page.getByText("Arabic", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Start course" })).toBeVisible()
})

test("featured carousel advances automatically and loops manually", async ({
  page,
}) => {
  await page.goto("/en")

  const carousel = page.locator('[data-slot="carousel"]')
  const track = carousel.locator('[data-slot="carousel-content"] > div')
  const previous = carousel.getByRole("button", { name: "Previous slide" })
  const next = carousel.getByRole("button", { name: "Next slide" })

  await expect(track).toHaveAttribute("style", /transform/, { timeout: 15_000 })
  await expect(previous).toBeEnabled()
  await expect(next).toBeEnabled()

  const initialTransform = await track.getAttribute("style")
  await expect
    .poll(() => track.getAttribute("style"), { timeout: 7_000 })
    .not.toBe(initialTransform)

  await next.click()
  await expect(previous).toBeEnabled()
  await expect(next).toBeEnabled()
})
