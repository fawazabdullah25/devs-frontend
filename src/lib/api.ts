import { levels, mockContent, topics } from "@/data/mock-content"
import type {
  AdminSummary,
  CatalogFilters,
  CatalogPayload,
  ContentUnit,
  HomePayload,
  LearningContent,
  MediaAsset,
  MediaProcessingStatus,
  StaticHlsInput,
  UnitInput,
  UploadGrant,
  Attachment,
  AttachmentUploadGrant,
  CurriculumInput,
} from "@/types/content"

const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "")
const useMocks =
  import.meta.env.MODE === "test" ||
  import.meta.env.VITE_USE_MOCKS === "true" ||
  !apiUrl
const mockAdminContent = [...mockContent]
const mockMedia = new Map<string, MediaAsset>()

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
    } catch {
      return null
    }
  }

  return publishedContent().find((content) => content.slug === slug) ?? null
}

export async function getAdminContent(): Promise<LearningContent[]> {
  if (!useMocks) return apiFetch<LearningContent[]>("/admin/content")
  return mockAdminContent
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
