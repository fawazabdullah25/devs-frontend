import { describe, expect, it } from "vitest"

import { mockContent } from "@/data/mock-content"
import { formatDuration, getContentDuration, localize } from "@/types/content"

describe("content presentation helpers", () => {
  it("falls back to English when an Arabic translation is absent", () => {
    expect(localize({ en: "English" }, "ar")).toBe("English")
  })

  it("formats course and series duration consistently", () => {
    expect(formatDuration(3599)).toBe("59m")
    expect(formatDuration(3660)).toBe("1h 1m")
    expect(getContentDuration(mockContent[0])).toBe(
      mockContent[0].units.reduce(
        (total, unit) => total + unit.media.durationSeconds,
        0
      )
    )
  })
})
