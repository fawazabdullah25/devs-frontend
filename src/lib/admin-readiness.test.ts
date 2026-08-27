import { describe, expect, it } from "vitest"

import { mockContent } from "@/data/mock-content"
import { getPublishingReadiness } from "@/lib/admin-readiness"

describe("getPublishingReadiness", () => {
  it("accepts a complete course with exactly one ready lesson", () => {
    const course = mockContent.find((item) => item.kind === "COURSE")!
    const result = getPublishingReadiness(course)

    expect(result.lessonCount).toBe(true)
    expect(result.media).toBe(true)
    expect(result.ready).toBe(true)
  })

  it("requires at least two lessons for a series", () => {
    const series = mockContent.find((item) => item.kind === "SERIES")!
    const incomplete = { ...series, units: [series.units[0]] }

    expect(getPublishingReadiness(incomplete).lessonCount).toBe(false)
    expect(getPublishingReadiness(incomplete).ready).toBe(false)
  })

  it("does not mark processing media as publishable", () => {
    const course = mockContent.find((item) => item.kind === "COURSE")!
    const processing = {
      ...course,
      units: course.units.map((unit) => ({
        ...unit,
        media: { ...unit.media, status: "PROCESSING" as const },
      })),
    }

    expect(getPublishingReadiness(processing).media).toBe(false)
    expect(getPublishingReadiness(processing).ready).toBe(false)
  })
})
