import { describe, expect, it } from "vitest"

import { validateMediaForm } from "@/lib/media-validation"
import type { MediaFormValues } from "@/lib/media-validation"

describe("media workflow validation", () => {
  it("reports each missing static HLS field independently", () => {
    const errors = validateMediaForm(values())

    expect(errors).toEqual({
      title: "requiredField",
      slug: "requiredField",
      position: "invalidPosition",
      manifestPath: "requiredField",
      encodingVersion: "requiredField",
    })
  })

  it("reports invalid optional checksum and malformed slug", () => {
    const errors = validateMediaForm(
      values({
        slug: "not a slug",
        checksumSha256: "not-a-sha256",
        manifestPath: "series/v1/master.m3u8",
        encodingVersion: "2026-08-17-v3",
        position: 1,
      })
    )

    expect(errors).toEqual({
      title: "requiredField",
      slug: "invalidSlug",
      checksumSha256: "invalidChecksum",
    })
  })

  it("accepts a complete static HLS form", () => {
    expect(
      validateMediaForm(
        values({
          title: "Lesson",
          slug: "lesson",
          position: 1,
          manifestPath: "series/v1/master.m3u8",
          encodingVersion: "2026-08-17-v3",
          sectionId: "section-1",
          requiresSection: true,
          checksumSha256: "a".repeat(64),
        })
      )
    ).toEqual({})
  })
})

function values(overrides: Partial<MediaFormValues> = {}): MediaFormValues {
  return {
    manifestPath: "",
    encodingVersion: "",
    checksumSha256: "",
    title: "",
    position: 0,
    slug: "",
    sectionId: null,
    requiresSection: false,
    ...overrides,
  }
}
