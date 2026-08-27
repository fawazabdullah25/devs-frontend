import { instructors, levels, mockContent, topics } from "@/data/mock-content"
import { lessonNumber } from "@/lib/curriculum"
import type {
  AdminSummary,
  CatalogFilters,
  CatalogPayload,
  ContentMetadataInput,
  ContentUnit,
  CoverUploadGrant,
  HomePayload,
  Instructor,
  LearningContent,
  MediaAsset,
  MediaLibraryItem,
  MediaVersion,
  MediaProcessingStatus,
  ReferenceData,
  StaticHlsInput,
  UnitInput,
  UnitUpdateInput,
  UploadGrant,
  Attachment,
  AttachmentUploadGrant,
  CurriculumInput,
  ContentCover,
} from "@/types/content"

const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "")
const useMocks =
  import.meta.env.MODE === "test" ||
  import.meta.env.VITE_USE_MOCKS === "true" ||
  !apiUrl
const mockAdminContent = [...mockContent]
const mockMedia = new Map<string, MediaAsset>()
const mockDeletedContent = new Map<string, LearningContent>()
const mockDeletedUnits = new Map<string, ContentUnit>()
const mockDeletedMedia = new Map<string, MediaLibraryItem>()
const mockMediaVersions = new Map<string, MediaVersion[]>()

const mockReferenceData: ReferenceData = {
  topics,
  levels,
  instructors,
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

export async function requestAttachmentUpload(
  unitId: string,
  file: File,
  title: string,
  titleAr?: string
): Promise<AttachmentUploadGrant> {
  if (!useMocks) {
    return apiFetch<AttachmentUploadGrant>(
      `/admin/units/${encodeURIComponent(unitId)}/attachments/uploads`,
      {
        method: "POST",
        body: JSON.stringify({
          title,
          titleAr: titleAr || undefined,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          contentLength: file.size,
        }),
      }
    )
  }
  const attachment: Attachment = {
    id: `attachment-${crypto.randomUUID()}`,
    titleEn: title,
    titleAr: titleAr || undefined,
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    contentLength: file.size,
    position: 1,
    status: "UPLOADING",
  }
  return {
    attachment,
    uploadUrl: "mock://attachment-upload",
    objectKey: `attachments/${unitId}/${attachment.id}/${file.name}`,
    headers: { "Content-Type": attachment.contentType },
    expiresAt: new Date(Date.now() + 20 * 60_000).toISOString(),
  }
}

export async function uploadAttachment(
  grant: AttachmentUploadGrant,
  file: File,
  onProgress: (percentage: number) => void
): Promise<void> {
  if (useMocks) {
    for (const percentage of [20, 55, 85, 100]) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      onProgress(percentage)
    }
    return
  }
  await uploadFile(grant.uploadUrl, grant.headers, file, onProgress)
}

export async function completeAttachment(
  unitId: string,
  attachment: Attachment
): Promise<Attachment> {
  if (!useMocks) {
    return apiFetch<Attachment>(
      `/admin/units/${encodeURIComponent(unitId)}/attachments/${encodeURIComponent(attachment.id)}/complete`,
      { method: "POST" }
    )
  }
  return {
    ...attachment,
    status: "READY",
    url: URL.createObjectURL(new Blob()),
  }
}

export async function deleteAttachment(
  unitId: string,
  attachmentId: string
): Promise<void> {
  if (useMocks) return
  await apiFetch<void>(
    `/admin/units/${encodeURIComponent(unitId)}/attachments/${encodeURIComponent(attachmentId)}`,
    { method: "DELETE" }
  )
}

export async function restoreAttachment(
  unitId: string,
  attachmentId: string,
  fallback?: Attachment
): Promise<Attachment> {
  if (!useMocks) {
    return apiFetch<Attachment>(
      `/admin/units/${encodeURIComponent(unitId)}/attachments/${encodeURIComponent(attachmentId)}/restore`,
      { method: "POST" }
    )
  }
  if (!fallback) throw new Error("Mock restoration requires attachment data")
  return {
    ...fallback,
    status: "READY",
    deletedAt: undefined,
    purgeAfter: undefined,
  }
}

export async function getDeletedAttachments(
  unitId: string
): Promise<Attachment[]> {
  if (useMocks) return []
  return apiFetch<Attachment[]>(
    `/admin/units/${encodeURIComponent(unitId)}/attachments/deleted`
  )
}

export async function updateAttachment(
  unitId: string,
  attachment: Attachment,
  title: string,
  titleAr: string | undefined,
  position = attachment.position
): Promise<Attachment> {
  if (!useMocks) {
    return apiFetch<Attachment>(
      `/admin/units/${encodeURIComponent(unitId)}/attachments/${encodeURIComponent(attachment.id)}`,
      { method: "PATCH", body: JSON.stringify({ title, titleAr, position }) }
    )
  }
  return { ...attachment, titleEn: title, titleAr, position }
}

export async function reorderAttachments(
  unitId: string,
  attachments: Attachment[]
): Promise<Attachment[]> {
  if (!useMocks) {
    return apiFetch<Attachment[]>(
      `/admin/units/${encodeURIComponent(unitId)}/attachments/order`,
      {
        method: "PUT",
        body: JSON.stringify({
          attachmentIds: attachments.map((item) => item.id),
        }),
      }
    )
  }
  return attachments.map((attachment, index) => ({
    ...attachment,
    position: index + 1,
  }))
}

async function uploadFile(
  url: string,
  headers: Record<string, string>,
  file: File,
  onProgress: (percentage: number) => void
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open("PUT", url)
    Object.entries(headers).forEach(([name, value]) =>
      request.setRequestHeader(name, value)
    )
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100))
    })
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) resolve()
      else reject(new ApiError(request.status, "The file upload failed"))
    })
    request.addEventListener("error", () =>
      reject(new Error("The upload could not reach object storage"))
    )
    request.send(file)
  })
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    ...init,
  })

  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as {
      detail?: string
      title?: string
    } | null
    throw new ApiError(
      response.status,
      problem?.detail ||
        problem?.title ||
        `Devs API request failed (${response.status})`
    )
  }

  if (response.status === 204) return undefined as T

  return response.json() as Promise<T>
}

function publishedContent() {
  return mockContent.filter((content) => content.status === "PUBLISHED")
}

export async function getHome(): Promise<HomePayload> {
  if (!useMocks) return apiFetch<HomePayload>("/public/home")

  const published = publishedContent()
  const featured = published
    .filter((content) => content.featuredRank !== undefined)
    .sort(
      (left, right) => (left.featuredRank ?? 99) - (right.featuredRank ?? 99)
    )

  return {
    featured: featured.length >= 4 ? featured : [],
    latest: [...published].sort((left, right) =>
      (right.publishedAt ?? "").localeCompare(left.publishedAt ?? "")
    ),
    counts: {
      courses: published.filter((content) => content.kind === "COURSE").length,
      series: published.filter((content) => content.kind === "SERIES").length,
      lessons: published.reduce(
        (total, content) => total + content.units.length,
        0
      ),
    },
  }
}

export async function getCatalog(
  filters: CatalogFilters = {}
): Promise<CatalogPayload> {
  if (!useMocks) {
    const parameters = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "ALL") parameters.set(key, value)
    })
    return apiFetch<CatalogPayload>(`/public/catalog?${parameters.toString()}`)
  }

  const query = filters.query?.trim().toLowerCase()
  const items = publishedContent().filter((content) => {
    const matchesQuery =
      !query ||
      [
        content.title.en,
        content.title.ar,
        content.summary.en,
        content.summary.ar,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query))
    const matchesKind =
      !filters.kind || filters.kind === "ALL" || content.kind === filters.kind
    const matchesTopic =
      !filters.topic ||
      content.topics.some((topic) => topic.slug === filters.topic)
    const matchesLevel = !filters.level || content.level.slug === filters.level
    const matchesLanguage =
      !filters.language ||
      filters.language === "ALL" ||
      content.spokenLanguage === filters.language

    return (
      matchesQuery &&
      matchesKind &&
      matchesTopic &&
      matchesLevel &&
      matchesLanguage
    )
  })

  return { items, totalItems: items.length, topics, levels }
}

export async function getContent(
  slug: string
): Promise<LearningContent | null> {
  if (!useMocks) {
    try {
      return await apiFetch<LearningContent>(
        `/public/content/${encodeURIComponent(slug)}`
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null
      throw error
    }
  }

  return publishedContent().find((content) => content.slug === slug) ?? null
}

export async function getAdminContent(): Promise<LearningContent[]> {
  if (!useMocks) return apiFetch<LearningContent[]>("/admin/content")
  return mockAdminContent
}

export async function getAdminContentById(
  contentId: string
): Promise<LearningContent | null> {
  if (!useMocks) {
    try {
      return await apiFetch<LearningContent>(
        `/admin/content/${encodeURIComponent(contentId)}`
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null
      throw error
    }
  }
  return (
    mockAdminContent.find((item) => item.id === contentId) ??
    mockDeletedContent.get(contentId) ??
    null
  )
}

export async function getDeletedAdminContent(): Promise<LearningContent[]> {
  if (!useMocks) {
    try {
      return await apiFetch<LearningContent[]>("/admin/content/deleted")
    } catch (error) {
      // This lets the new UI coexist with an older staging service while the
      // trash endpoint is being rolled out. Other API errors remain visible.
      if (error instanceof ApiError && error.status === 404) return []
      throw error
    }
  }
  return [...mockDeletedContent.values()]
}

export async function getReferenceData(): Promise<ReferenceData> {
  if (!useMocks) {
    const data = await apiFetch<BackendReferenceData>("/admin/reference-data")
    return {
      topics: data.topics,
      levels: data.levels,
      instructors: data.instructors.map(normalizeInstructor),
    }
  }
  return mockReferenceData
}

export async function getAdminSummary(): Promise<AdminSummary> {
  if (!useMocks) return apiFetch<AdminSummary>("/admin/analytics/summary")

  return {
    published: mockAdminContent.filter((item) => item.status === "PUBLISHED")
      .length,
    drafts: mockAdminContent.filter((item) => item.status === "DRAFT").length,
    archived: mockAdminContent.filter((item) => item.status === "ARCHIVED")
      .length,
    processingMedia: mockAdminContent
      .flatMap((item) => item.units)
      .filter((unit) => unit.media.status === "PROCESSING").length,
    views: mockAdminContent.reduce((total, item) => total + item.views, 0),
    watchedMinutes: mockAdminContent.reduce(
      (total, item) => total + item.watchedMinutes,
      0
    ),
  }
}

export async function createDraft(input: {
  title: string
  slug: string
  summary: string
  kind: "COURSE" | "SERIES"
  visibility: "PUBLIC" | "AUTHENTICATED" | "STUDENT_ONLY"
}): Promise<LearningContent> {
  if (!useMocks) {
    return apiFetch<LearningContent>("/admin/content", {
      method: "POST",
      body: JSON.stringify(input),
    })
  }

  await new Promise((resolve) => setTimeout(resolve, 450))
  const created: LearningContent = {
    id: `draft-${crypto.randomUUID()}`,
    slug: input.slug,
    kind: input.kind,
    status: "DRAFT",
    visibility: input.visibility,
    title: { en: input.title },
    summary: { en: input.summary },
    description: { en: "" },
    spokenLanguage: "MIXED",
    level: levels[0],
    topics: [],
    instructors: [],
    sections: [],
    units: [],
    views: 0,
    watchedMinutes: 0,
  }
  mockAdminContent.unshift(created)
  return created
}

export async function updateDraft(
  id: string,
  input: {
    title: string
    slug: string
    summary: string
    kind: "COURSE" | "SERIES"
    visibility: "PUBLIC" | "AUTHENTICATED" | "STUDENT_ONLY"
  }
): Promise<LearningContent> {
  if (!useMocks) {
    return apiFetch<LearningContent>(
      `/admin/content/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      }
    )
  }

  await new Promise((resolve) => setTimeout(resolve, 350))
  const existing = mockAdminContent.find((item) => item.id === id)
  if (!existing) throw new Error("Content not found")
  const updated = {
    ...existing,
    slug: input.slug,
    kind: input.kind,
    visibility: input.visibility,
    title: { ...existing.title, en: input.title },
    summary: { ...existing.summary, en: input.summary },
  }
  mockAdminContent.splice(mockAdminContent.indexOf(existing), 1, updated)
  return updated
}

export async function updateContentMetadata(
  contentId: string,
  input: ContentMetadataInput
): Promise<LearningContent> {
  if (!useMocks) {
    return apiFetch<LearningContent>(
      `/admin/content/${encodeURIComponent(contentId)}`,
      { method: "PATCH", body: JSON.stringify(input) }
    )
  }

  const existing = mockAdminContent.find((item) => item.id === contentId)
  if (!existing) throw new Error("Content not found")
  const updated: LearningContent = {
    ...existing,
    slug: input.slug,
    visibility: input.visibility,
    spokenLanguage: input.spokenLanguage,
    title: { en: input.title, ar: input.titleAr || undefined },
    summary: { en: input.summary, ar: input.summaryAr || undefined },
    description: {
      en: input.description,
      ar: input.descriptionAr || undefined,
    },
    level:
      mockReferenceData.levels.find(
        (level) => level.slug === input.levelSlug
      ) ?? existing.level,
    topics: mockReferenceData.topics.filter((topic) =>
      input.topicSlugs.includes(topic.slug)
    ),
    instructors: mockReferenceData.instructors.filter((instructor) =>
      input.instructorIds.includes(instructor.id)
    ),
    featuredRank: input.featuredRank,
  }
  mockAdminContent.splice(mockAdminContent.indexOf(existing), 1, updated)
  return updated
}

export async function requestCoverUpload(
  contentId: string,
  file: File
): Promise<CoverUploadGrant> {
  if (!useMocks) {
    return apiFetch<CoverUploadGrant>(
      `/admin/content/${encodeURIComponent(contentId)}/cover/uploads`,
      {
        method: "POST",
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "image/jpeg",
          contentLength: file.size,
        }),
      }
    )
  }
  return {
    cover: {
      id: `cover-${crypto.randomUUID()}`,
      filename: file.name,
      contentType: file.type || "image/jpeg",
      contentLength: file.size,
      status: "UPLOADING",
    },
    uploadUrl: "mock://cover-upload",
    objectKey: `covers/${contentId}/${file.name}`,
    headers: { "Content-Type": file.type || "image/jpeg" },
    expiresAt: new Date(Date.now() + 20 * 60_000).toISOString(),
  }
}

export async function uploadCoverImage(
  grant: CoverUploadGrant,
  file: File,
  onProgress: (percentage: number) => void
): Promise<void> {
  if (useMocks) {
    for (const percentage of [25, 60, 100]) {
      await new Promise((resolve) => setTimeout(resolve, 70))
      onProgress(percentage)
    }
    return
  }
  await uploadFile(grant.uploadUrl, grant.headers, file, onProgress)
}

export async function completeCoverUpload(
  contentId: string,
  coverId: string
): Promise<ContentCover> {
  if (!useMocks) {
    return apiFetch<ContentCover>(
      `/admin/content/${encodeURIComponent(contentId)}/cover/complete`,
      { method: "POST", body: JSON.stringify({ coverId }) }
    )
  }
  const existing = mockAdminContent.find((item) => item.id === contentId)
  if (!existing) throw new Error("Content not found")
  const cover: ContentCover = {
    id: coverId,
    status: "READY",
    url: `https://images.example.test/covers/${coverId}`,
  }
  const updated = {
    ...existing,
    coverUrl: cover.url,
  }
  mockAdminContent.splice(mockAdminContent.indexOf(existing), 1, updated)
  return cover
}

export async function deleteCover(contentId: string): Promise<void> {
  if (!useMocks) {
    return apiFetch<void>(
      `/admin/content/${encodeURIComponent(contentId)}/cover`,
      { method: "DELETE" }
    )
  }
  const existing = mockAdminContent.find((item) => item.id === contentId)
  if (!existing) throw new Error("Content not found")
  const updated = { ...existing, coverUrl: undefined }
  mockAdminContent.splice(mockAdminContent.indexOf(existing), 1, updated)
}

export async function requestMediaUpload(file: File): Promise<UploadGrant> {
  if (!useMocks) {
    return apiFetch<UploadGrant>("/admin/media/uploads", {
      method: "POST",
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || "video/mp4",
        contentLength: file.size,
      }),
    })
  }
  const mediaId = `media-${crypto.randomUUID()}`
  mockMedia.set(mediaId, {
    id: mediaId,
    status: "UPLOADING",
    durationSeconds: 0,
    provider: "MUX",
    captions: [],
  })
  return {
    mediaId,
    uploadUrl: "mock://upload",
    objectKey: `source/mock/${file.name}`,
    headers: { "Content-Type": file.type || "video/mp4" },
    expiresAt: new Date(Date.now() + 20 * 60_000).toISOString(),
  }
}

export async function uploadMediaSource(
  grant: UploadGrant,
  file: File,
  onProgress: (percentage: number) => void
): Promise<void> {
  if (useMocks) {
    for (const percentage of [18, 43, 71, 100]) {
      await new Promise((resolve) => setTimeout(resolve, 120))
      onProgress(percentage)
    }
    return
  }

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open("PUT", grant.uploadUrl)
    Object.entries(grant.headers).forEach(([name, value]) =>
      request.setRequestHeader(name, value)
    )
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    })
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) resolve()
      else reject(new ApiError(request.status, "The video upload failed"))
    })
    request.addEventListener("error", () =>
      reject(new Error("The video upload could not reach object storage"))
    )
    request.send(file)
  })
}

export async function startMediaIngest(mediaId: string): Promise<void> {
  if (useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 250))
    const media = mockMedia.get(mediaId)
    if (media) mockMedia.set(mediaId, { ...media, status: "PROCESSING" })
    return
  }
  await apiFetch(`/admin/media/${encodeURIComponent(mediaId)}/ingest`, {
    method: "POST",
  })
}

export async function registerStaticHls(
  input: StaticHlsInput
): Promise<MediaProcessingStatus> {
  if (!useMocks) {
    return apiFetch<MediaProcessingStatus>("/admin/media/static-hls", {
      method: "POST",
      body: JSON.stringify(input),
    })
  }
  await new Promise((resolve) => setTimeout(resolve, 250))
  const mediaId = `media-${crypto.randomUUID()}`
  const media: MediaAsset = {
    id: mediaId,
    status: "READY",
    durationSeconds: input.durationSeconds,
    provider: "STATIC_HLS",
    playbackUrl: `https://video.example.test/${input.manifestPath}`,
    captions: input.captions.map((caption) => ({
      language: caption.language,
      label: caption.label,
      url: `https://video.example.test/${caption.path}`,
      defaultTrack: caption.defaultTrack,
    })),
  }
  mockMedia.set(mediaId, media)
  return {
    mediaId,
    status: "READY",
    provider: "STATIC_HLS",
    playbackUrl: media.playbackUrl,
    durationSeconds: input.durationSeconds,
    captions: media.captions,
  }
}

export async function getMediaStatus(
  mediaId: string
): Promise<MediaProcessingStatus> {
  if (!useMocks) {
    return apiFetch<MediaProcessingStatus>(
      `/admin/media/${encodeURIComponent(mediaId)}`
    )
  }
  return {
    mediaId,
    status: "READY",
    provider: mockMedia.get(mediaId)?.provider ?? "MUX",
    durationSeconds: 3600,
    playbackId: `mock-${mediaId}`,
  }
}

function mediaLibraryFromContent(
  contentItems: LearningContent[]
): MediaLibraryItem[] {
  return contentItems.flatMap((content) =>
    content.units.flatMap((unit) => {
      const lesson = lessonNumber(content, unit.id)
      const video: MediaLibraryItem = {
        id: unit.media.id,
        kind: "VIDEO",
        status: unit.media.status,
        provider: unit.media.provider,
        title: unit.title.en,
        durationSeconds: unit.media.durationSeconds,
        encodingVersion: unit.media.encodingVersion,
        captions: unit.media.captions,
        playbackUrl: unit.media.playbackUrl,
        technicalPath: unit.media.technicalPath,
        updatedAt: unit.media.updatedAt,
        attachedContentId: content.id,
        attachedContentTitle: content.title,
        attachedUnitId: unit.id,
        attachedUnitTitle: unit.title,
        lessonNumber: lesson,
      }
      const attachments = (unit.attachments ?? []).map((attachment) => ({
        id: attachment.id,
        kind: "ATTACHMENT" as const,
        status:
          attachment.status === "DELETED"
            ? ("DELETED" as const)
            : ("READY" as const),
        title: attachment.titleEn,
        filename: attachment.filename,
        contentType: attachment.contentType,
        contentLength: attachment.contentLength,
        captions: [],
        updatedAt: attachment.deletedAt ?? new Date().toISOString(),
        attachedContentId: content.id,
        attachedContentTitle: content.title,
        attachedUnitId: unit.id,
        attachedUnitTitle: unit.title,
        lessonNumber: lesson,
        deletedAt: attachment.deletedAt,
        purgeAfter: attachment.purgeAfter,
      }))
      return [video, ...attachments]
    })
  )
}

interface BackendMediaLibraryItem {
  mediaId: string
  provider?: MediaAsset["provider"]
  status: MediaAsset["status"] | "DELETED"
  providerAssetId?: string
  playbackId?: string
  playbackPath?: string
  playbackUrl?: string
  durationSeconds?: number
  encodingVersion?: string
  checksumSha256?: string
  captions?: MediaAsset["captions"]
  createdAt?: string
  updatedAt?: string
  deletedAt?: string
  purgeAfter?: string
  retainedForUnitId?: string
  currentAttachment?: {
    contentId: string
    contentTitle: string
    unitId: string
    unitTitle: string
  }
}

interface BackendInstructorProfile {
  id: string
  nameEn?: string
  nameAr?: string | null
  bioEn?: string | null
  bioAr?: string | null
  initials?: string
  avatarUrl?: string | null
  accountSubject?: string | null
}

interface BackendReferenceData {
  topics: ReferenceData["topics"]
  levels: ReferenceData["levels"]
  instructors: BackendInstructorProfile[]
}

function normalizeInstructor(
  instructor: BackendInstructorProfile | Instructor
): Instructor {
  if ("name" in instructor) return instructor
  return {
    id: instructor.id,
    name: {
      en: instructor.nameEn ?? "",
      ar: instructor.nameAr || undefined,
    },
    bio: {
      en: instructor.bioEn ?? "",
      ar: instructor.bioAr || undefined,
    },
    initials: instructor.initials ?? "",
    avatarUrl: instructor.avatarUrl || undefined,
  }
}

/**
 * The backend calls the immutable asset identifier `mediaId`, while the
 * frontend's existing media model uses `id`. Keep both values available and
 * guarantee that UI consumers always receive a usable `id`.
 */
type MediaVersionPayload = Omit<MediaVersion, "id" | "captions"> & {
  id?: string
  captions?: MediaVersion["captions"]
}

export function normalizeMediaVersion(item: MediaVersionPayload): MediaVersion {
  const id = item.mediaId ?? item.id
  if (!id) throw new Error("Media version is missing its identifier")
  return {
    ...item,
    id,
    mediaId: id,
    captions: item.captions ?? [],
  }
}

function mediaVersionFromAsset(
  media: MediaAsset,
  current: boolean
): MediaVersion {
  return {
    id: media.id,
    mediaId: media.id,
    current,
    status: media.status,
    provider: media.provider,
    durationSeconds: media.durationSeconds,
    playbackId: media.playbackId,
    playbackUrl: media.playbackUrl,
    technicalPath: media.technicalPath,
    encodingVersion: media.encodingVersion,
    captions: media.captions,
    updatedAt: media.updatedAt,
  }
}

function normalizeMediaLibraryItem(
  item: BackendMediaLibraryItem
): MediaLibraryItem {
  const attachment = item.currentAttachment
  return {
    id: item.mediaId,
    mediaId: item.mediaId,
    kind: "VIDEO",
    status: item.status,
    provider: item.provider,
    title:
      attachment?.unitTitle ??
      item.playbackPath?.split("/").pop() ??
      item.mediaId,
    durationSeconds: item.durationSeconds,
    encodingVersion: item.encodingVersion,
    captions: item.captions ?? [],
    playbackUrl: item.playbackUrl,
    technicalPath: item.playbackPath,
    playbackPath: item.playbackPath,
    checksumSha256: item.checksumSha256,
    updatedAt: item.updatedAt,
    attachedContentId: attachment?.contentId,
    attachedContentTitle: attachment
      ? { en: attachment.contentTitle }
      : undefined,
    attachedUnitId: attachment?.unitId,
    attachedUnitTitle: attachment ? { en: attachment.unitTitle } : undefined,
    deletedAt: item.deletedAt,
    purgeAfter: item.purgeAfter,
  }
}

export async function getMediaLibrary(): Promise<MediaLibraryItem[]> {
  if (!useMocks) {
    const items = await apiFetch<BackendMediaLibraryItem[]>("/admin/media")
    return items.map(normalizeMediaLibraryItem)
  }
  const attached = mediaLibraryFromContent(mockAdminContent)
  const unattached = [...mockMedia.values()].map((media) => ({
    id: media.id,
    kind: "VIDEO" as const,
    status: media.status,
    provider: media.provider,
    title: media.technicalPath?.split("/").pop() ?? media.id,
    durationSeconds: media.durationSeconds,
    encodingVersion: media.encodingVersion,
    captions: media.captions,
    playbackUrl: media.playbackUrl,
    technicalPath: media.technicalPath,
    updatedAt: media.updatedAt,
  }))
  return [...attached, ...unattached]
}

export async function getDeletedMediaLibrary(): Promise<MediaLibraryItem[]> {
  if (!useMocks) {
    try {
      const items = await apiFetch<BackendMediaLibraryItem[]>(
        "/admin/media/deleted"
      )
      return items.map(normalizeMediaLibraryItem)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return []
      throw error
    }
  }
  return [...mockDeletedMedia.values()]
}

export async function deleteMedia(mediaId: string): Promise<void> {
  if (!useMocks) {
    await apiFetch<void>(`/admin/media/${encodeURIComponent(mediaId)}`, {
      method: "DELETE",
    })
    return
  }
  const attached = mediaLibraryFromContent(mockAdminContent).some(
    (item) => item.id === mediaId && item.attachedUnitId
  )
  if (attached)
    throw new Error(
      "Attached media must be replaced or its lesson removed first"
    )
  const media = mockMedia.get(mediaId)
  if (!media) throw new Error("Media not found")
  mockMedia.delete(mediaId)
  mockDeletedMedia.set(mediaId, {
    id: mediaId,
    kind: "VIDEO",
    status: "DELETED",
    provider: media.provider,
    title: media.technicalPath?.split("/").pop() ?? mediaId,
    durationSeconds: media.durationSeconds,
    encodingVersion: media.encodingVersion,
    captions: media.captions,
    playbackUrl: media.playbackUrl,
    technicalPath: media.technicalPath,
    updatedAt: new Date().toISOString(),
    deletedAt: new Date().toISOString(),
    purgeAfter: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  })
}

export async function restoreMedia(mediaId: string): Promise<MediaLibraryItem> {
  if (!useMocks) {
    const item = await apiFetch<BackendMediaLibraryItem>(
      `/admin/media/${encodeURIComponent(mediaId)}/restore`,
      { method: "POST" }
    )
    return normalizeMediaLibraryItem(item)
  }
  const deleted = mockDeletedMedia.get(mediaId)
  if (!deleted) throw new Error("Deleted media not found")
  mockDeletedMedia.delete(mediaId)
  mockMedia.set(mediaId, {
    id: mediaId,
    status: "READY",
    provider: deleted.provider ?? "STATIC_HLS",
    durationSeconds: deleted.durationSeconds ?? 0,
    encodingVersion: deleted.encodingVersion,
    captions: deleted.captions,
    playbackUrl: deleted.playbackUrl,
    technicalPath: deleted.technicalPath,
    updatedAt: new Date().toISOString(),
  })
  return {
    ...deleted,
    status: "READY",
    deletedAt: undefined,
    purgeAfter: undefined,
  }
}

export async function replaceUnitMedia(
  contentId: string,
  unitId: string,
  mediaId: string
): Promise<MediaVersion> {
  if (!useMocks) {
    return apiFetch<MediaVersion>(
      `/admin/content/${encodeURIComponent(contentId)}/units/${encodeURIComponent(unitId)}/media`,
      { method: "PUT", body: JSON.stringify({ mediaId }) }
    )
  }
  const content = mockAdminContent.find((item) => item.id === contentId)
  const media = mockMedia.get(mediaId)
  if (!content || !media) throw new Error("Content or media not found")
  const unit = content.units.find((item) => item.id === unitId)
  if (!unit) throw new Error("Lesson not found")
  if (unit.media.id !== mediaId) {
    const previous = mediaVersionFromAsset(unit.media, false)
    previous.deletedAt = new Date().toISOString()
    previous.purgeAfter = new Date(Date.now() + 7 * 86_400_000).toISOString()
    const retained = mockMediaVersions.get(unitId) ?? []
    mockMediaVersions.set(unitId, [
      previous,
      ...retained.filter((version) => version.id !== previous.id),
    ])
  }
  const updated = {
    ...content,
    units: content.units.map((item) =>
      item.id === unitId ? { ...item, media } : item
    ),
  }
  mockAdminContent.splice(mockAdminContent.indexOf(content), 1, updated)
  return mediaVersionFromAsset(media, true)
}

export async function getMediaVersions(
  contentId: string,
  unitId: string
): Promise<MediaVersion[]> {
  if (!useMocks) {
    const versions = await apiFetch<MediaVersion[]>(
      `/admin/content/${encodeURIComponent(contentId)}/units/${encodeURIComponent(unitId)}/media/versions`
    )
    return versions.map(normalizeMediaVersion)
  }
  const content = mockAdminContent.find((item) => item.id === contentId)
  const unit = content?.units.find((item) => item.id === unitId)
  if (!unit) throw new Error("Lesson not found")
  const current = mediaVersionFromAsset(unit.media, true)
  return [
    current,
    ...(mockMediaVersions.get(unitId) ?? [])
      .filter((version) => version.id !== current.id)
      .map(normalizeMediaVersion),
  ]
}

export async function restoreMediaVersion(
  contentId: string,
  unitId: string,
  mediaId: string
): Promise<MediaVersion[]> {
  if (!useMocks) {
    const versions = await apiFetch<MediaVersion[]>(
      `/admin/content/${encodeURIComponent(contentId)}/units/${encodeURIComponent(unitId)}/media/versions/${encodeURIComponent(mediaId)}/restore`,
      { method: "POST" }
    )
    return versions.map(normalizeMediaVersion)
  }
  const retained = mockMediaVersions.get(unitId) ?? []
  const selected = retained.find((version) => version.id === mediaId)
  if (selected) {
    mockMedia.set(mediaId, {
      id: mediaId,
      status: selected.status,
      provider: selected.provider,
      durationSeconds: selected.durationSeconds,
      playbackId: selected.playbackId,
      playbackUrl: selected.playbackUrl,
      technicalPath: selected.technicalPath,
      encodingVersion: selected.encodingVersion,
      captions: selected.captions,
    })
  }
  const restored = normalizeMediaVersion(
    await replaceUnitMedia(contentId, unitId, mediaId)
  )
  mockMediaVersions.set(
    unitId,
    (mockMediaVersions.get(unitId) ?? []).filter(
      (version) => version.id !== mediaId
    )
  )
  return [restored, ...(mockMediaVersions.get(unitId) ?? [])]
}

export async function addContentUnit(
  contentId: string,
  input: UnitInput
): Promise<LearningContent> {
  if (!useMocks) {
    return apiFetch<LearningContent>(
      `/admin/content/${encodeURIComponent(contentId)}/units`,
      { method: "POST", body: JSON.stringify(input) }
    )
  }
  const existing = mockAdminContent.find((item) => item.id === contentId)
  if (!existing) throw new Error("Content not found")
  const unit: ContentUnit = {
    id: `unit-${crypto.randomUUID()}`,
    slug: input.slug,
    position: input.position,
    sectionId: input.sectionId,
    title: { en: input.title, ar: input.titleAr },
    summary: input.summary
      ? { en: input.summary, ar: input.summaryAr }
      : undefined,
    media: mockMedia.get(input.mediaId) ?? {
      id: input.mediaId,
      status: "READY",
      durationSeconds: 3600,
      provider: "MUX",
      playbackId: `mock-${input.mediaId}`,
      captions: [],
    },
  }
  const updated: LearningContent = {
    ...existing,
    units: [...existing.units, unit].sort(
      (left, right) => left.position - right.position
    ),
  }
  mockAdminContent.splice(mockAdminContent.indexOf(existing), 1, updated)
  return updated
}

export async function updateContentUnit(
  contentId: string,
  unitId: string,
  input: UnitUpdateInput
): Promise<LearningContent> {
  if (!useMocks) {
    return apiFetch<LearningContent>(
      `/admin/content/${encodeURIComponent(contentId)}/units/${encodeURIComponent(unitId)}`,
      { method: "PATCH", body: JSON.stringify(input) }
    )
  }
  const existing = mockAdminContent.find((item) => item.id === contentId)
  if (!existing) throw new Error("Content not found")
  if (!existing.units.some((unit) => unit.id === unitId)) {
    throw new Error("Lesson not found")
  }
  const updated = {
    ...existing,
    units: existing.units.map((unit) =>
      unit.id === unitId
        ? {
            ...unit,
            slug: input.slug,
            title: { en: input.title, ar: input.titleAr },
            summary: input.summary
              ? { en: input.summary, ar: input.summaryAr }
              : undefined,
          }
        : unit
    ),
  }
  mockAdminContent.splice(mockAdminContent.indexOf(existing), 1, updated)
  return updated
}

export async function deleteContentUnit(
  contentId: string,
  unitId: string
): Promise<ContentUnit> {
  if (!useMocks) {
    return apiFetch<ContentUnit>(
      `/admin/content/${encodeURIComponent(contentId)}/units/${encodeURIComponent(unitId)}`,
      { method: "DELETE" }
    )
  }
  const existing = mockAdminContent.find((item) => item.id === contentId)
  const unit = existing?.units.find((item) => item.id === unitId)
  if (!existing || !unit) throw new Error("Lesson not found")
  mockDeletedUnits.set(unitId, {
    ...unit,
    media: { ...unit.media },
  })
  const updated = {
    ...existing,
    units: existing.units.filter((item) => item.id !== unitId),
  }
  mockAdminContent.splice(mockAdminContent.indexOf(existing), 1, updated)
  return unit
}

export async function getDeletedContentUnits(
  contentId: string
): Promise<ContentUnit[]> {
  if (!useMocks) {
    try {
      return await apiFetch<ContentUnit[]>(
        `/admin/content/${encodeURIComponent(contentId)}/units/deleted`
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return []
      throw error
    }
  }
  return [...mockDeletedUnits.values()]
}

export async function restoreContentUnit(
  contentId: string,
  unitId: string
): Promise<ContentUnit> {
  if (!useMocks) {
    return apiFetch<ContentUnit>(
      `/admin/content/${encodeURIComponent(contentId)}/units/${encodeURIComponent(unitId)}/restore`,
      { method: "POST" }
    )
  }
  const existing = mockAdminContent.find((item) => item.id === contentId)
  const deleted = mockDeletedUnits.get(unitId)
  if (!existing || !deleted) throw new Error("Deleted lesson not found")
  const updated = {
    ...existing,
    units: [...existing.units, deleted].sort(
      (left, right) => left.position - right.position
    ),
  }
  mockDeletedUnits.delete(unitId)
  mockAdminContent.splice(mockAdminContent.indexOf(existing), 1, updated)
  return deleted
}

export async function getInstructors(): Promise<Instructor[]> {
  if (!useMocks) {
    const data =
      await apiFetch<BackendInstructorProfile[]>("/admin/instructors")
    return data.map(normalizeInstructor)
  }
  return mockReferenceData.instructors
}

export async function createInstructor(input: {
  nameEn: string
  nameAr?: string
  bioEn: string
  bioAr?: string
  initials: string
  avatarUrl?: string
}): Promise<Instructor> {
  if (!useMocks) {
    const instructor = await apiFetch<BackendInstructorProfile>(
      "/admin/instructors",
      {
        method: "POST",
        body: JSON.stringify(input),
      }
    )
    return normalizeInstructor(instructor)
  }
  const instructor: Instructor = {
    id: `instructor-${crypto.randomUUID()}`,
    name: { en: input.nameEn, ar: input.nameAr || undefined },
    bio: { en: input.bioEn, ar: input.bioAr || undefined },
    initials: input.initials,
    avatarUrl: input.avatarUrl,
  }
  mockReferenceData.instructors.push(instructor)
  return instructor
}

export async function updateInstructor(
  instructorId: string,
  input: {
    nameEn: string
    nameAr?: string
    bioEn: string
    bioAr?: string
    initials: string
    avatarUrl?: string
  }
): Promise<Instructor> {
  if (!useMocks) {
    const instructor = await apiFetch<BackendInstructorProfile>(
      `/admin/instructors/${encodeURIComponent(instructorId)}`,
      { method: "PATCH", body: JSON.stringify(input) }
    )
    return normalizeInstructor(instructor)
  }
  const existing = mockReferenceData.instructors.find(
    (item) => item.id === instructorId
  )
  if (!existing) throw new Error("Instructor not found")
  const updated: Instructor = {
    ...existing,
    name: { en: input.nameEn, ar: input.nameAr || undefined },
    bio: { en: input.bioEn, ar: input.bioAr || undefined },
    initials: input.initials,
    avatarUrl: input.avatarUrl,
  }
  mockReferenceData.instructors.splice(
    mockReferenceData.instructors.indexOf(existing),
    1,
    updated
  )
  return updated
}

export async function replaceCurriculum(
  contentId: string,
  input: CurriculumInput
): Promise<LearningContent> {
  if (!useMocks) {
    return apiFetch<LearningContent>(
      `/admin/content/${encodeURIComponent(contentId)}/curriculum`,
      { method: "PUT", body: JSON.stringify(input) }
    )
  }
  const existing = mockAdminContent.find((item) => item.id === contentId)
  if (!existing) throw new Error("Content not found")
  if (existing.kind !== "SERIES") throw new Error("Only series have sections")

  const sections = input.sections.map((section, index) => ({
    id: section.id ?? `section-${crypto.randomUUID()}`,
    position: index + 1,
    title: { en: section.title, ar: section.titleAr },
    description: section.description
      ? { en: section.description, ar: section.descriptionAr }
      : undefined,
  }))
  const sectionIdsByUnit = new Map<string, string>()
  input.sections.forEach((section, index) =>
    section.unitIds.forEach((unitId) =>
      sectionIdsByUnit.set(unitId, sections[index].id)
    )
  )
  const orderedIds = [
    ...input.sections.flatMap((section) => section.unitIds),
    ...input.unsectionedUnitIds,
  ]
  const unitsById = new Map(existing.units.map((unit) => [unit.id, unit]))
  const units = orderedIds.map((id, index) => ({
    ...unitsById.get(id)!,
    position: index + 1,
    sectionId: sectionIdsByUnit.get(id),
  }))
  const updated = { ...existing, sections, units }
  mockAdminContent.splice(mockAdminContent.indexOf(existing), 1, updated)
  return updated
}

export async function publishContent(id: string): Promise<LearningContent> {
  if (!useMocks) {
    return apiFetch<LearningContent>(
      `/admin/content/${encodeURIComponent(id)}/publish`,
      { method: "POST" }
    )
  }
  return changeMockStatus(id, "PUBLISHED")
}

export async function archiveContent(id: string): Promise<LearningContent> {
  if (!useMocks) {
    return apiFetch<LearningContent>(
      `/admin/content/${encodeURIComponent(id)}/archive`,
      { method: "POST" }
    )
  }
  return changeMockStatus(id, "ARCHIVED")
}

export async function unarchiveContent(id: string): Promise<LearningContent> {
  if (!useMocks) {
    return apiFetch<LearningContent>(
      `/admin/content/${encodeURIComponent(id)}/unarchive`,
      { method: "POST" }
    )
  }
  const existing = mockAdminContent.find((item) => item.id === id)
  if (!existing) throw new Error("Content not found")
  const updated = { ...existing, status: "DRAFT" as const }
  mockAdminContent.splice(mockAdminContent.indexOf(existing), 1, updated)
  return updated
}

export async function deleteContent(id: string): Promise<LearningContent> {
  if (!useMocks) {
    return apiFetch<LearningContent>(
      `/admin/content/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      }
    )
  }
  const index = mockAdminContent.findIndex((item) => item.id === id)
  if (index < 0) throw new Error("Content not found")
  const existing = mockAdminContent[index]
  const deletedAt = new Date().toISOString()
  mockDeletedContent.set(id, {
    ...existing,
    status: "ARCHIVED",
    deletedAt,
    purgeAfter: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  })
  mockAdminContent.splice(index, 1)
  return mockDeletedContent.get(id)!
}

export async function restoreContent(id: string): Promise<LearningContent> {
  if (!useMocks) {
    return apiFetch<LearningContent>(
      `/admin/content/${encodeURIComponent(id)}/restore`,
      { method: "POST" }
    )
  }
  const deleted = mockDeletedContent.get(id)
  if (!deleted) throw new Error("Deleted content not found")
  const restored = {
    ...deleted,
    status: "DRAFT" as const,
    deletedAt: undefined,
    purgeAfter: undefined,
  }
  mockDeletedContent.delete(id)
  mockAdminContent.unshift(restored)
  return restored
}

function changeMockStatus(
  id: string,
  status: LearningContent["status"]
): LearningContent {
  const existing = mockAdminContent.find((item) => item.id === id)
  if (!existing) throw new Error("Content not found")
  const updated = {
    ...existing,
    status,
    publishedAt:
      status === "PUBLISHED"
        ? existing.publishedAt || new Date().toISOString()
        : existing.publishedAt,
  }
  mockAdminContent.splice(mockAdminContent.indexOf(existing), 1, updated)
  return updated
}
