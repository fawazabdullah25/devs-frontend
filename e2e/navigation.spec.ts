import { expect, test } from "@playwright/test"

test("admin sidebar exposes every section", async ({ page }) => {
  await page.goto("/en/admin")
  await expect(
    page.getByRole("heading", { name: "Learning operations" })
  ).toBeVisible({ timeout: 15_000 })

  const navigation = page.getByRole("navigation", { name: "Admin menu" })
  await expect(navigation.getByRole("button")).toHaveCount(5)
  await expect(
    navigation.getByRole("button", { name: "Overview" })
  ).toBeVisible()
  await expect(navigation.getByRole("button", { name: "Media" })).toBeVisible()

  await navigation.getByRole("button", { name: "Content", exact: true }).click()
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

test("admin curriculum workflow exposes Static HLS only", async ({ page }) => {
  await page.goto("/en/admin")
  await page.getByRole("button", { name: "Content", exact: true }).click()
  await page.getByRole("link", { name: "Web Foundations" }).click()
  await page.getByRole("tab", { name: "Curriculum", exact: true }).click()
  await page.getByRole("button", { name: "Add lesson", exact: true }).click()

  const dialog = page.getByRole("dialog", { name: "Add lesson" })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel("Lesson title")).toBeVisible()
  await expect(dialog.getByLabel("Lesson slug")).toBeVisible()
  await expect(dialog.getByLabel("Relative master playlist path")).toBeVisible()
  await expect(dialog.getByLabel("Encoding version")).toBeVisible()
  await expect(dialog.getByText("Captions", { exact: true })).toBeVisible()

  await dialog.getByRole("button", { name: "Add lesson", exact: true }).click()
  await expect(
    dialog.getByText("This field is required.").first()
  ).toBeVisible()
})

test("new content dialog allows selecting kind and visibility", async ({
  page,
}) => {
  await page.goto("/en/admin")
  await page.getByRole("button", { name: "Content", exact: true }).click()
  await page.getByRole("button", { name: "New content", exact: true }).click()

  const dialog = page.getByRole("dialog", { name: "Create learning content" })
  await expect(dialog).toBeVisible()

  const series = dialog.getByRole("button", { name: "Series", exact: true })
  const studentsOnly = dialog.getByRole("button", {
    name: "Student accounts only",
    exact: true,
  })

  await series.click()
  await studentsOnly.click()

  await expect(series).toHaveAttribute("aria-pressed", "true")
  await expect(studentsOnly).toHaveAttribute("aria-pressed", "true")
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

  await page.goto("/en/catalog")
  await expect(
    page.getByRole("link", { name: "View course: Git Without Fear" })
  ).toHaveAttribute("href", "/en/courses/git-without-fear")
  await expect(
    page.getByRole("link", { name: "View series: Web Foundations" })
  ).toHaveAttribute("href", "/en/series/web-foundations")
  await page.goto("/en")

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
  await expect(
    page.getByRole("button", { name: "Attachments · none" })
  ).toBeDisabled()
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

test("sectioned series expose grouped curriculum and hierarchical lessons", async ({
  page,
}) => {
  await page.goto("/en/series/web-foundations")

  await expect(
    page.getByText("The foundations", { exact: true }).first()
  ).toBeVisible()
  await expect(
    page.getByText("A resilient experience", { exact: true })
  ).toBeVisible()
  await expect(page.getByText("Lesson 1.1", { exact: true })).toBeVisible()

  await page.goto("/en/series/web-foundations/lessons/responsive-layouts")
  await expect(page.getByText("Lesson 2.1", { exact: true })).toBeVisible()
  await expect(page.getByText("3 / 4", { exact: true })).toBeVisible()
  await expect(page.locator('aside a[aria-current="page"]')).toContainText(
    "2.1"
  )
  await expect(
    page.locator("aside").getByRole("button", {
      name: "Attachments · none",
    })
  ).toBeDisabled()
  await expect(
    page.getByRole("navigation", { name: "Curriculum" })
  ).toBeVisible()
})

test("admin curriculum editor organizes sections without drag and drop", async ({
  page,
}) => {
  await page.goto("/en/admin/content/content-web-foundations/curriculum")

  await expect(page).toHaveURL(
    /\/en\/admin\/content\/content-web-foundations\?tab=curriculum$/
  )

  await expect(
    page.getByRole("tab", { name: "Current lessons", exact: true })
  ).toBeVisible({ timeout: 15_000 })
  await expect(
    page.getByText("The foundations", { exact: true }).first()
  ).toBeVisible()
  await expect(page.getByText("1.1", { exact: true }).first()).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Save curriculum" })
  ).toBeDisabled()

  await page.getByRole("button", { name: "Move down" }).first().click()
  await expect(
    page.getByRole("button", { name: "Save curriculum" })
  ).toBeEnabled()
})
