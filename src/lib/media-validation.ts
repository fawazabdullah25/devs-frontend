export type MediaFormField =
  | "manifestPath"
  | "encodingVersion"
  | "checksumSha256"
  | "title"
  | "position"
  | "slug"
  | "sectionId"

export type MediaValidationMessage =
  "requiredField" | "invalidSlug" | "invalidPosition" | "invalidChecksum"

export type MediaFormErrors = Partial<
  Record<MediaFormField, MediaValidationMessage>
>

export interface MediaFormValues {
  manifestPath: string
  encodingVersion: string
  checksumSha256: string
  title: string
  position: number
  slug: string
  sectionId: string | null
  requiresSection: boolean
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const checksumPattern = /^[a-fA-F0-9]{64}$/

/**
 * Keeps the media workflow's validation independent from React so it can be
 * exercised without mounting the dialog or making an API request.
 */
export function validateMediaForm(values: MediaFormValues): MediaFormErrors {
  const errors: MediaFormErrors = {}

  if (!values.title.trim()) errors.title = "requiredField"

  if (!values.slug.trim()) errors.slug = "requiredField"
  else if (!slugPattern.test(values.slug)) errors.slug = "invalidSlug"

  if (!Number.isFinite(values.position) || values.position <= 0) {
    errors.position = "invalidPosition"
  }

  if (values.requiresSection && !values.sectionId) {
    errors.sectionId = "requiredField"
  }

  if (!values.manifestPath.trim()) errors.manifestPath = "requiredField"
  if (!values.encodingVersion.trim()) {
    errors.encodingVersion = "requiredField"
  }
  if (
    values.checksumSha256.trim() &&
    !checksumPattern.test(values.checksumSha256.trim())
  ) {
    errors.checksumSha256 = "invalidChecksum"
  }

  return errors
}
