import { describe, expect, it } from "vitest"

import { mockContent } from "@/data/mock-content"
import {
  curriculumGroups,
  lessonNumber,
  orderedSeriesUnits,
} from "@/lib/curriculum"

describe("series curriculum", () => {
  it("groups lessons and assigns hierarchical numbers", () => {
    const content = mockContent.find((item) => item.slug === "web-foundations")!

    const groups = curriculumGroups(content)

    expect(groups).toHaveLength(2)
    expect(groups[0].units.map((unit) => unit.slug)).toEqual([
      "semantic-html",
      "modern-css",
    ])
    expect(lessonNumber(content, groups[0].units[1].id)).toBe("1.2")
    expect(lessonNumber(content, groups[1].units[0].id)).toBe("2.1")
    expect(orderedSeriesUnits(content).map((unit) => unit.slug)).toEqual([
      "semantic-html",
      "modern-css",
      "responsive-layouts",
      "accessibility",
    ])
  })

  it("preserves the ordinary sequence for flat series", () => {
    const content = mockContent.find(
      (item) => item.slug === "spring-boot-from-zero"
    )!

    expect(curriculumGroups(content)).toEqual([])
    expect(lessonNumber(content, content.units[1].id)).toBe("2")
  })
})
