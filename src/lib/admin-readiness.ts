import type { LearningContent } from "@/types/content"

export interface ReadinessResult {
  metadata: boolean
  cover: boolean
  lessonCount: boolean
  media: boolean
  sections: boolean
  ready: boolean
}

export function getPublishingReadiness(
  content: LearningContent
): ReadinessResult {
  const metadata = Boolean(
    content.title.en.trim() &&
    content.summary.en.trim() &&
    content.description.en.trim() &&
    content.slug.trim()
  )
  const lessonCount =
    content.kind === "COURSE"
      ? content.units.length === 1
      : content.units.length >= 2
  const media =
    content.units.length > 0 &&
    content.units.every((unit) => unit.media.status === "READY")
  const sections =
    content.kind === "COURSE" ||
    content.sections.length === 0 ||
    content.units.every(
      (unit) =>
        unit.sectionId &&
        content.sections.some((section) => section.id === unit.sectionId)
    )
  return {
    metadata,
    cover: true,
    lessonCount,
    media,
    sections,
    ready: metadata && lessonCount && media && sections,
  }
}
