// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ContentWorkspace } from "@/components/admin/content-workspace"
import { mockContent, tags, instructors } from "@/data/mock-content"
import { LocaleProvider } from "@/lib/locale-context"

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ invalidate: vi.fn() }),
}))

vi.mock("@/components/admin/content-details-form", () => ({
  ContentDetailsForm: () => <div data-testid="content-details" />,
}))

vi.mock("@/components/admin/content-publishing", () => ({
  ContentPublishing: () => <div data-testid="content-publishing" />,
}))

vi.mock("@/components/admin/lesson-management", () => ({
  LessonManagement: () => <div data-testid="lesson-management" />,
}))

vi.mock("@/components/curriculum-editor", () => ({
  CurriculumEditor: () => <div data-testid="curriculum-editor" />,
}))

const draft = mockContent.find((item) => item.status === "DRAFT")!
const referenceData = { tags, instructors }

function renderWorkspace(status: "DRAFT" | "PUBLISHED") {
  return render(
    <LocaleProvider locale="en">
      <ContentWorkspace
        initialContent={{ ...draft, status }}
        initialReferenceData={referenceData}
        tab="details"
        onTabChange={vi.fn()}
        onDeleted={vi.fn()}
      />
    </LocaleProvider>
  )
}

describe("ContentWorkspace preview", () => {
  afterEach(cleanup)

  it("disables draft preview with an accessible explanation", () => {
    renderWorkspace("DRAFT")

    const preview = screen.getByRole("button", { name: "Preview" })
    const descriptionId = preview.getAttribute("aria-describedby")

    expect(preview.hasAttribute("disabled")).toBe(true)
    expect(descriptionId).toBeTruthy()
    expect(document.getElementById(descriptionId!)?.textContent).toContain(
      "Preview is available after this content is published."
    )
  })

  it("renders one link preview for published content", () => {
    renderWorkspace("PUBLISHED")

    expect(
      screen.getByRole("button", { name: "Preview" }).getAttribute("href")
    ).toBe("/en/courses/containers-clearly")
    expect(
      screen.getByRole("button", { name: "Preview" }).hasAttribute("disabled")
    ).toBe(false)
  })
})
