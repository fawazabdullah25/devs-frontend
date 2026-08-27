export type Locale = "en" | "ar"

export type ContentKind = "COURSE" | "SERIES"
export type PublicationStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED"
export type ContentVisibility = "PUBLIC" | "AUTHENTICATED" | "STUDENT_ONLY"
export type MediaStatus = "UPLOADING" | "PROCESSING" | "READY" | "FAILED"
export type SpokenLanguage = "AR" | "EN" | "MIXED"
export type MediaProvider = "MUX" | "STATIC_HLS" | "LOCAL"
export type MediaLibraryKind = "VIDEO" | "ATTACHMENT"

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
  playbackUrl?: string
  playbackToken?: string
  provider: MediaProvider
  encodingVersion?: string
  technicalPath?: string
  updatedAt?: string
  captions: CaptionTrack[]
}

export interface CaptionTrack {
  language: string
  label: string
  url: string
  defaultTrack: boolean
}

export interface Attachment {
  id: string
  titleEn: string
  titleAr?: string
  filename: string
  contentType: string
  contentLength: number
  position: number
  url?: string
  status: "UPLOADING" | "READY" | "DELETED"
  deletedAt?: string
  purgeAfter?: string
}

export interface ContentSection {
  id: string
  position: number
  title: LocalizedText
  description?: LocalizedText
}

export interface ContentUnit {
  id: string
  slug: string
  position: number
  sectionId?: string
  title: LocalizedText
  summary?: LocalizedText
  media: MediaAsset
  attachments?: Attachment[]
  deletedAt?: string
  purgeAfter?: string
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
  sections: ContentSection[]
  units: ContentUnit[]
  coverUrl?: string
  featuredRank?: number
  publishedAt?: string
  views: number
  watchedMinutes: number
  deletedAt?: string
  purgeAfter?: string
}

export interface ContentMetadataInput {
  title: string
  titleAr?: string
  slug: string
  summary: string
  summaryAr?: string
  description: string
  descriptionAr?: string
  visibility: ContentVisibility
  spokenLanguage: SpokenLanguage
  levelSlug: string
  topicSlugs: string[]
  instructorIds: string[]
  featuredRank?: number
}

export interface ReferenceData {
  topics: Topic[]
  levels: Level[]
  instructors: Instructor[]
}

export interface CoverUploadGrant {
  cover: ContentCover
  uploadUrl: string
  objectKey: string
  headers: Record<string, string>
  expiresAt: string
}

export interface ContentCover {
  id: string
  filename?: string
  contentType?: string
  contentLength?: number
  status?: string
  url?: string
  createdAt?: string
  updatedAt?: string
  deletedAt?: string
  purgeAfter?: string
}

export interface MediaLibraryItem {
  id: string
  mediaId?: string
  kind: MediaLibraryKind
  status: MediaStatus | "DELETED"
  provider?: MediaProvider
  title: string
  filename?: string
  contentType?: string
  contentLength?: number
  durationSeconds?: number
  encodingVersion?: string
  captions: CaptionTrack[]
  playbackUrl?: string
  technicalPath?: string
  updatedAt?: string
  playbackPath?: string
  checksumSha256?: string
  currentAttachment?: {
    contentId: string
    contentTitle: string
    unitId: string
    unitTitle: string
  }
  attachedContentId?: string
  attachedContentTitle?: LocalizedText
  attachedUnitId?: string
  attachedUnitTitle?: LocalizedText
  lessonNumber?: string
  deletedAt?: string
  purgeAfter?: string
}

export interface MediaVersion {
  id: string
  mediaId?: string
  current?: boolean
  status: MediaStatus
  provider: MediaProvider
  durationSeconds: number
  providerAssetId?: string
  playbackId?: string
  playbackUrl?: string
  playbackPath?: string
  encodingVersion?: string
  technicalPath?: string
  checksumSha256?: string
  captions: CaptionTrack[]
  createdAt?: string
  updatedAt?: string
  deletedAt?: string
  purgeAfter?: string
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

export interface AttachmentUploadGrant {
  attachment: Attachment
  uploadUrl: string
  objectKey: string
  headers: Record<string, string>
  expiresAt: string
}

export interface MediaProcessingStatus {
  mediaId: string
  status: MediaStatus
  provider?: MediaAsset["provider"]
  providerAssetId?: string
  playbackId?: string
  playbackUrl?: string
  durationSeconds: number
  encodingVersion?: string
  technicalPath?: string
  captions?: CaptionTrack[]
  errorMessage?: string
}

export interface StaticHlsInput {
  manifestPath: string
  durationSeconds: number
  checksumSha256?: string
  encodingVersion: string
  captions: Array<{
    language: string
    label: string
    path: string
    defaultTrack: boolean
  }>
}

export interface UnitInput {
  slug: string
  position: number
  title: string
  titleAr?: string
  summary?: string
  summaryAr?: string
  mediaId: string
  sectionId?: string
}

export interface UnitUpdateInput {
  title: string
  titleAr?: string
  summary?: string
  summaryAr?: string
  slug: string
}

export interface CurriculumSectionInput {
  id?: string
  title: string
  titleAr?: string
  description?: string
  descriptionAr?: string
  unitIds: string[]
}

export interface CurriculumInput {
  sections: CurriculumSectionInput[]
  unsectionedUnitIds: string[]
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
