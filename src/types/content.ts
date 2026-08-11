export type Locale = "en" | "ar"

export type ContentKind = "COURSE" | "SERIES"
export type PublicationStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED"
export type ContentVisibility = "PUBLIC" | "AUTHENTICATED" | "STUDENT_ONLY"
export type MediaStatus = "UPLOADING" | "PROCESSING" | "READY" | "FAILED"
export type SpokenLanguage = "AR" | "EN" | "MIXED"

export interface LocalizedText {
  en: string
  ar?: string
}

export interface Instructor {
  id: string
  name: LocalizedText
  bio: LocalizedText
  initials: string
  avatarUrl?: string
}

export interface Topic {
  id: string
  slug: string
  name: LocalizedText
}

export interface Level {
  id: string
  slug: string
  name: LocalizedText
}

export interface MediaAsset {
  id: string
  status: MediaStatus
  durationSeconds: number
  playbackId?: string
  playbackToken?: string
  provider: "MUX" | "LOCAL"
}

export interface ContentUnit {
  id: string
  slug: string
  position: number
  title: LocalizedText
  summary?: LocalizedText
  media: MediaAsset
}

export interface LearningContent {
  id: string
  slug: string
  kind: ContentKind
  status: PublicationStatus
  visibility: ContentVisibility
  title: LocalizedText
  summary: LocalizedText
  description: LocalizedText
  spokenLanguage: SpokenLanguage
  level: Level
  topics: Topic[]
  instructors: Instructor[]
  units: ContentUnit[]
  coverUrl?: string
  featuredRank?: number
  publishedAt?: string
  views: number
  watchedMinutes: number
}

export interface CatalogFilters {
  query?: string
  kind?: ContentKind | "ALL"
  topic?: string
  level?: string
  language?: SpokenLanguage | "ALL"
}

export interface HomePayload {
  featured: LearningContent[]
  latest: LearningContent[]
  counts: {
    courses: number
    series: number
    lessons: number
  }
}

export interface CatalogPayload {
  items: LearningContent[]
  totalItems: number
  topics: Topic[]
  levels: Level[]
}

export interface AdminSummary {
  published: number
  drafts: number
  archived: number
  processingMedia: number
  views: number
  watchedMinutes: number
}

export interface UploadGrant {
  mediaId: string
  uploadUrl: string
  objectKey: string
  headers: Record<string, string>
  expiresAt: string
}

export interface MediaProcessingStatus {
  mediaId: string
  status: MediaStatus
  providerAssetId?: string
  playbackId?: string
  durationSeconds: number
  errorMessage?: string
}

export interface UnitInput {
  slug: string
  position: number
  title: string
  titleAr?: string
  summary?: string
  summaryAr?: string
  mediaId: string
}

export function localize(value: LocalizedText, locale: Locale): string {
  return value[locale] || value.en
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

export function getContentDuration(content: LearningContent): number {
  return content.units.reduce(
    (total, unit) => total + unit.media.durationSeconds,
    0
  )
}
