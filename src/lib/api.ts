import { levels, mockContent, topics } from "@/data/mock-content"
import type {
  AdminSummary,
  CatalogFilters,
  CatalogPayload,
  ContentUnit,
  HomePayload,
  LearningContent,
  MediaProcessingStatus,
  UnitInput,
  UploadGrant,
} from "@/types/content"

const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "")
const useMocks = import.meta.env.VITE_USE_MOCKS === "true" || !apiUrl
const mockAdminContent = [...mockContent]

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
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
  return {
    mediaId: `media-${crypto.randomUUID()}`,
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
    return
  }
  await apiFetch(`/admin/media/${encodeURIComponent(mediaId)}/ingest`, {
    method: "POST",
  })
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
    title: { en: input.title, ar: input.titleAr },
    summary: input.summary
      ? { en: input.summary, ar: input.summaryAr }
      : undefined,
    media: {
      id: input.mediaId,
      status: "READY",
      durationSeconds: 3600,
      provider: "MUX",
      playbackId: `mock-${input.mediaId}`,
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
