import type {
  ContentSection,
  ContentUnit,
  LearningContent,
} from "@/types/content"

export interface CurriculumGroup {
  section: ContentSection
  units: ContentUnit[]
  durationSeconds: number
}

export function curriculumGroups(
  content: Pick<LearningContent, "sections" | "units">
): CurriculumGroup[] {
  return [...content.sections]
    .sort((left, right) => left.position - right.position)
    .map((section) => {
      const units = content.units
        .filter((unit) => unit.sectionId === section.id)
        .sort((left, right) => left.position - right.position)
      return {
        section,
        units,
        durationSeconds: units.reduce(
          (total, unit) => total + unit.media.durationSeconds,
          0
        ),
      }
    })
}

export function orderedSeriesUnits(
  content: Pick<LearningContent, "sections" | "units">
): ContentUnit[] {
  if (!content.sections.length) {
    return [...content.units].sort(
      (left, right) => left.position - right.position
    )
  }
  const groupedIds = new Set<string>()
  const grouped = curriculumGroups(content).flatMap((group) => {
    group.units.forEach((unit) => groupedIds.add(unit.id))
    return group.units
  })
  const unsectioned = content.units
    .filter((unit) => !groupedIds.has(unit.id))
    .sort((left, right) => left.position - right.position)
  return [...grouped, ...unsectioned]
}

export function lessonNumber(
  content: Pick<LearningContent, "sections" | "units">,
  unitId: string
): string {
  if (!content.sections.length) {
    const index = orderedSeriesUnits(content).findIndex(
      (unit) => unit.id === unitId
    )
    return String(index + 1)
  }
  const groups = curriculumGroups(content)
  for (const [sectionIndex, group] of groups.entries()) {
    const unitIndex = group.units.findIndex((unit) => unit.id === unitId)
    if (unitIndex >= 0) return `${sectionIndex + 1}.${unitIndex + 1}`
  }
  const unsectionedIndex = content.units
    .filter((unit) => !unit.sectionId)
    .sort((left, right) => left.position - right.position)
    .findIndex((unit) => unit.id === unitId)
  return String(unsectionedIndex + 1)
}
