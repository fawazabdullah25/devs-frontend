// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { mockContent } from "@/data/mock-content"
import { LocaleProvider } from "@/lib/locale-context"
import { LessonDialog } from "@/components/admin/lesson-dialog"

const content = mockContent.find(
  (item) => item.id === "content-web-foundations"
)!
const unit = content.units[0]

function renderDialog() {
  return render(
    <LocaleProvider locale="en">
      <LessonDialog
        content={content}
        unit={unit}
        open
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />
    </LocaleProvider>
  )
}

describe("LessonDialog", () => {
  it("keeps lesson editing in one centered dialog with separate tabs", async () => {
    renderDialog()

    expect(screen.getByRole("dialog", { name: /Manage lesson/ })).toBeTruthy()
    expect(screen.getByRole("tab", { name: "Details" })).toBeTruthy()
    expect(screen.getByRole("tab", { name: "Video" })).toBeTruthy()
    expect(screen.getByRole("tab", { name: "Captions" })).toBeTruthy()
    expect(screen.getByRole("tab", { name: "Attachments" })).toBeTruthy()

    fireEvent.click(screen.getByRole("tab", { name: "Video" }))
    await waitFor(() =>
      expect(
        screen.getByLabelText("Relative master playlist path")
      ).toBeTruthy()
    )
    expect(screen.queryByLabelText("Duration in seconds")).toBeNull()

    fireEvent.click(screen.getByRole("tab", { name: "Captions" }))
    expect(screen.getByText("Add caption")).toBeTruthy()
  })

  it("returns a selected caption path from the upload callback", async () => {
    const onUpload = vi.fn(async () => "captions/english.vtt")
    render(
      <LocaleProvider locale="en">
        <LessonDialog
          content={content}
          unit={unit}
          open
          onOpenChange={vi.fn()}
          onSaved={vi.fn()}
          onCaptionUpload={onUpload}
        />
      </LocaleProvider>
    )

    fireEvent.click(screen.getByRole("tab", { name: "Captions" }))
    fireEvent.click(screen.getByRole("button", { name: "Add caption" }))

    const input = screen.getByLabelText("Relative VTT path")
    const file = new File(["WEBVTT"], "english.vtt", { type: "text/vtt" })
    const upload = screen.getAllByRole("button", { name: "Upload .vtt" }).at(-1)
    expect(upload).toBeDefined()
    fireEvent.click(upload!)
    const fileInput = document.querySelector(
      'input[type="file"][accept=".vtt,text/vtt"]'
    ) as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => expect(onUpload).toHaveBeenCalledWith(file))
    await waitFor(() =>
      expect(input.getAttribute("value")).toBe("captions/english.vtt")
    )
  })
})
