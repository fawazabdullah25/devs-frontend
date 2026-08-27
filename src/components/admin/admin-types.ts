import type {
  LearningContent,
  MediaLibraryItem,
  ReferenceData,
} from "@/types/content"

export type AdminSection =
  "overview" | "content" | "media" | "team" | "settings"

export interface AdminSnapshot {
  summary: {
    published: number
    drafts: number
    archived: number
    processingMedia: number
    views: number
    watchedMinutes: number
  }
  content: LearningContent[]
  deletedContent: LearningContent[]
  referenceData: ReferenceData
}

export interface AdminMutationHandlers {
  onContentChanged?: (content: LearningContent) => void
  onRefresh?: () => void
}

export type MediaView = "active" | "trash"

export interface MediaSnapshot {
  active: MediaLibraryItem[]
  deleted: MediaLibraryItem[]
}
