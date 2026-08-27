// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ContentCreateDialog } from "@/components/admin/content-create-dialog"
import { LocaleProvider } from "@/lib/locale-context"

describe("ContentCreateDialog", () => {
  it("allows selecting the content kind and visibility", () => {
    render(
      <LocaleProvider locale="en">
        <ContentCreateDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />
      </LocaleProvider>
    )

    const series = screen.getByRole("button", { name: "Series" })
    const studentOnly = screen.getByRole("button", {
      name: "Student accounts only",
    })

    fireEvent.click(series)
    fireEvent.click(studentOnly)

    expect(series.getAttribute("aria-pressed")).toBe("true")
    expect(studentOnly.getAttribute("aria-pressed")).toBe("true")
  })
})
