// @vitest-environment jsdom

import * as React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

describe("ToggleGroup in a form", () => {
  it("changes a single selection without submitting the form", () => {
    const submitted = vi.fn()

    function Example() {
      const [value, setValue] = React.useState("COURSE")
      return (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            submitted()
          }}
        >
          <ToggleGroup
            value={[value]}
            onValueChange={(next) => setValue(next[0] ?? value)}
            variant="selection"
          >
            <ToggleGroupItem type="button" value="COURSE">
              Course
            </ToggleGroupItem>
            <ToggleGroupItem type="button" value="SERIES">
              Series
            </ToggleGroupItem>
          </ToggleGroup>
        </form>
      )
    }

    render(<Example />)
    fireEvent.click(screen.getByRole("button", { name: "Series" }))

    expect(
      screen
        .getByRole("button", { name: "Series" })
        .getAttribute("aria-pressed")
    ).toBe("true")
    expect(submitted).not.toHaveBeenCalled()
  })
})
