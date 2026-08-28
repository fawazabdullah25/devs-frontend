import * as React from "react"
import { FileArrowUpIcon, FloppyDiskIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  getAdminContentById,
  registerStaticHls,
  replaceUnitMedia,
  updateMediaCaptions,
  updateContentUnit,
} from "@/lib/api"
import { useLocale } from "@/lib/locale-context"
import { formatDuration } from "@/types/content"
import { toast } from "@/components/ui/toast"
import { AttachmentManager } from "@/components/attachment-manager"
import type { ContentUnit, LearningContent } from "@/types/content"
import { CaptionTrackEditor, emptyCaption } from "./caption-track-editor"
import type { CaptionDraft } from "./caption-track-editor"
import { MediaVersionHistory } from "./media-version-history"

type LessonTab = "details" | "video" | "captions" | "attachments"

type DetailsValues = {
  title: string
  titleAr: string
  slug: string
  summary: string
  summaryAr: string
  sectionId: string
}

type VideoValues = {
  manifestPath: string
  encodingVersion: string
  checksumSha256: string
}

type FormErrors = Partial<
  Record<keyof DetailsValues | keyof VideoValues | "form", string>
>

type CaptionUpload = (file: File) => Promise<string>

function detailsFromUnit(unit: ContentUnit): DetailsValues {
  return {
    title: unit.title.en,
    titleAr: unit.title.ar ?? "",
    slug: unit.slug,
    summary: unit.summary?.en ?? "",
    summaryAr: unit.summary?.ar ?? "",
    sectionId: unit.sectionId ?? "",
  }
}

function videoFromUnit(unit: ContentUnit): VideoValues {
  const media = unit.media as ContentUnit["media"] & {
    checksumSha256?: string
  }
  return {
    manifestPath: media.technicalPath ?? "",
    encodingVersion: media.encodingVersion ?? "",
    checksumSha256: media.checksumSha256 ?? "",
  }
}

function captionPath(caption: ContentUnit["media"]["captions"][number]) {
  const withPath = caption as typeof caption & { path?: string }
  if (withPath.path) return withPath.path

  try {
    return new URL(caption.url).pathname.replace(/^\/+/, "")
  } catch {
    return caption.url
  }
}

function captionsFromUnit(unit: ContentUnit): CaptionDraft[] {
  return unit.media.captions.map((caption) => ({
    ...emptyCaption(caption.language),
    label: caption.label,
    path: captionPath(caption),
    defaultTrack: caption.defaultTrack,
  }))
}

function captionInput(captions: CaptionDraft[]) {
  return captions.map((caption) => ({
    language: caption.language.trim(),
    label: caption.label.trim(),
    path: caption.path.trim(),
    defaultTrack: caption.defaultTrack,
  }))
}

function hasSameValues(left: VideoValues, right: VideoValues) {
  return (
    left.manifestPath.trim() === right.manifestPath.trim() &&
    left.encodingVersion.trim() === right.encodingVersion.trim() &&
    left.checksumSha256.trim() === right.checksumSha256.trim()
  )
}

/**
 * Manage one lesson from a single, predictable workflow.
 *
 * Details, video replacement, captions, and attachments deliberately live in
 * separate tabs. Saving Details or Captions does not create a media version;
 * only an explicit submission in the Video tab registers and attaches a new
 * HLS package.
 */
export function LessonDialog({
  content,
  unit,
  open,
  onOpenChange,
  onSaved,
  onAttachmentsChanged,
  onCaptionUpload,
}: {
  content: LearningContent
  unit: ContentUnit | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (content: LearningContent) => void
  onAttachmentsChanged?: (attachments: ContentUnit["attachments"]) => void
  onCaptionUpload?: CaptionUpload
}) {
  const { locale, t } = useLocale()
  const [tab, setTab] = React.useState<LessonTab>("details")
  const [details, setDetails] = React.useState<DetailsValues | null>(null)
  const [video, setVideo] = React.useState<VideoValues | null>(null)
  const [captions, setCaptions] = React.useState<CaptionDraft[]>([])
  const [detailsErrors, setDetailsErrors] = React.useState<FormErrors>({})
  const [videoErrors, setVideoErrors] = React.useState<FormErrors>({})
  const [captionError, setCaptionError] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [progress, setProgress] = React.useState(0)

  React.useEffect(() => {
    if (!open || !unit) return
    setTab("details")
    setDetails(detailsFromUnit(unit))
    setVideo(videoFromUnit(unit))
    setCaptions(captionsFromUnit(unit))
    setDetailsErrors({})
    setVideoErrors({})
    setCaptionError("")
    setProgress(0)
  }, [open, unit?.id])

  const refresh = async () => {
    if (!unit) return
    const saved = await getAdminContentById(content.id)
    if (!saved) throw new Error("Content not found after lesson update")
    onSaved(saved)
  }

  const saveDetails = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!unit || !details) return
    const errors: FormErrors = {}
    if (!details.title.trim()) errors.title = t("requiredField")
    if (!details.slug.trim()) errors.slug = t("requiredField")
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(details.slug.trim())) {
      errors.slug = t("invalidSlug")
    }
    setDetailsErrors(errors)
    if (Object.keys(errors).length) {
      document
        .getElementById(
          errors.title ? "manage-lesson-title" : "manage-lesson-slug"
        )
        ?.focus()
      return
    }

    setBusy(true)
    try {
      const saved = await updateContentUnit(content.id, unit.id, {
        title: details.title.trim(),
        titleAr: details.titleAr.trim() || undefined,
        slug: details.slug.trim(),
        summary: details.summary.trim() || undefined,
        summaryAr: details.summaryAr.trim() || undefined,
        sectionId: details.sectionId || undefined,
      })
      onSaved(saved)
      toast.add({ title: t("metadataSaved"), type: "success" })
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : t("saveFailed")
      setDetailsErrors({ form: message })
      toast.add({ title: t("saveFailed"), description: message, type: "error" })
    } finally {
      setBusy(false)
    }
  }

  const saveVideo = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!unit || !video) return
    const errors: FormErrors = {}
    if (!video.manifestPath.trim()) errors.manifestPath = t("requiredField")
    if (!video.encodingVersion.trim())
      errors.encodingVersion = t("requiredField")
    if (
      video.checksumSha256.trim() &&
      !/^[a-f\d]{64}$/i.test(video.checksumSha256.trim())
    ) {
      errors.checksumSha256 = t("invalidChecksum")
    }
    if (Object.keys(errors).length) {
      setVideoErrors(errors)
      return
    }

    setBusy(true)
    setProgress(15)
    setVideoErrors({})
    try {
      const registrationInput = {
        manifestPath: video.manifestPath.trim(),
        encodingVersion: video.encodingVersion.trim(),
        checksumSha256: video.checksumSha256.trim() || undefined,
        captions: captionInput(captions),
      } as Parameters<typeof registerStaticHls>[0]
      const registered = await registerStaticHls(registrationInput)
      setProgress(70)
      await replaceUnitMedia(content.id, unit.id, registered.mediaId)
      await refresh()
      setProgress(100)
      toast.add({ title: t("videoAttached"), type: "success" })
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : t("uploadFailed")
      setVideoErrors({ form: message })
      toast.add({
        title: t("uploadFailed"),
        description: message,
        type: "error",
      })
    } finally {
      setBusy(false)
    }
  }

  const saveCaptions = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!unit) return
    if (
      captions.some(
        (caption) =>
          !caption.language.trim() ||
          !caption.label.trim() ||
          !caption.path.trim()
      )
    ) {
      setCaptionError(t("completeCaptionFields"))
      return
    }
    setBusy(true)
    setCaptionError("")
    try {
      // Caption metadata has its own endpoint and does not create a media
      // version. Uploaded files already contain the relative object path.
      await updateMediaCaptions(unit.media.id, captionInput(captions))
      await refresh()
      toast.add({ title: t("metadataSaved"), type: "success" })
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : t("saveFailed")
      setCaptionError(message)
      toast.add({ title: t("saveFailed"), description: message, type: "error" })
    } finally {
      setBusy(false)
    }
  }

  if (!unit || !details || !video) return null

  const originalVideo = videoFromUnit(unit)
  const videoDirty = !hasSameValues(video, originalVideo)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-5 pe-12">
          <DialogTitle>
            {t("manageLesson")} · {unit.title[locale] || unit.title.en}
          </DialogTitle>
          <DialogDescription>{t("lessonDetails")}</DialogDescription>
        </DialogHeader>
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as LessonTab)}
          className="min-h-0 flex-1 gap-0"
        >
          <TabsList
            variant="line"
            className="mx-6 shrink-0 justify-start overflow-x-auto"
          >
            <TabsTrigger value="details">{t("details")}</TabsTrigger>
            <TabsTrigger value="video">{t("video")}</TabsTrigger>
            <TabsTrigger value="captions">{t("captions")}</TabsTrigger>
            <TabsTrigger value="attachments">{t("attachments")}</TabsTrigger>
          </TabsList>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <TabsContent value="details" className="flex flex-col gap-5">
              <form
                className="flex flex-col gap-5"
                onSubmit={saveDetails}
                noValidate
              >
                <FieldGroup>
                  <Field data-invalid={Boolean(detailsErrors.title)}>
                    <FieldLabel htmlFor="manage-lesson-title">
                      {t("lessonTitle")}
                    </FieldLabel>
                    <Input
                      id="manage-lesson-title"
                      value={details.title}
                      onChange={(event) =>
                        setDetails({ ...details, title: event.target.value })
                      }
                      aria-invalid={Boolean(detailsErrors.title)}
                    />
                    <FieldError>{detailsErrors.title}</FieldError>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="manage-lesson-title-ar">
                      {t("titleArabic")}
                    </FieldLabel>
                    <Input
                      id="manage-lesson-title-ar"
                      dir="rtl"
                      value={details.titleAr}
                      onChange={(event) =>
                        setDetails({ ...details, titleAr: event.target.value })
                      }
                    />
                  </Field>
                  <Field data-invalid={Boolean(detailsErrors.slug)}>
                    <FieldLabel htmlFor="manage-lesson-slug">
                      {t("lessonSlug")}
                    </FieldLabel>
                    <Input
                      id="manage-lesson-slug"
                      value={details.slug}
                      onChange={(event) =>
                        setDetails({ ...details, slug: event.target.value })
                      }
                      aria-invalid={Boolean(detailsErrors.slug)}
                    />
                    <FieldDescription>{t("slug")}</FieldDescription>
                    <FieldError>{detailsErrors.slug}</FieldError>
                  </Field>
                  {content.kind === "SERIES" && (
                    <Field>
                      <FieldLabel>{t("destinationSection")}</FieldLabel>
                      <Select
                        value={details.sectionId || "unsectioned"}
                        onValueChange={(value) =>
                          setDetails({
                            ...details,
                            sectionId:
                              value === "unsectioned" || !value ? "" : value,
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("chooseSection")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unsectioned">
                            {t("unsectioned")}
                          </SelectItem>
                          {content.sections.map((candidate) => (
                            <SelectItem key={candidate.id} value={candidate.id}>
                              {candidate.position}.{" "}
                              {candidate.title[locale] || candidate.title.en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldDescription>{t("destination")}</FieldDescription>
                    </Field>
                  )}
                  <Field>
                    <FieldLabel htmlFor="manage-lesson-summary">
                      {t("lessonSummary")}
                    </FieldLabel>
                    <Textarea
                      id="manage-lesson-summary"
                      value={details.summary}
                      onChange={(event) =>
                        setDetails({ ...details, summary: event.target.value })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="manage-lesson-summary-ar">
                      {t("summaryArabic")}
                    </FieldLabel>
                    <Textarea
                      id="manage-lesson-summary-ar"
                      dir="rtl"
                      value={details.summaryAr}
                      onChange={(event) =>
                        setDetails({
                          ...details,
                          summaryAr: event.target.value,
                        })
                      }
                    />
                  </Field>
                </FieldGroup>
                <FieldError>{detailsErrors.form}</FieldError>
                <DialogFooter>
                  <Button type="submit" disabled={busy}>
                    <FloppyDiskIcon
                      data-icon="inline-start"
                      aria-hidden="true"
                    />
                    {busy ? t("loading") : t("saveChanges")}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            <TabsContent value="video" className="flex flex-col gap-5">
              <form
                className="flex flex-col gap-5"
                onSubmit={saveVideo}
                noValidate
              >
                <Card>
                  <CardHeader>
                    <CardTitle>{t("mediaSource")}</CardTitle>
                    <CardDescription>
                      {t("onlyStaticHlsDescription")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <dl>
                      <dt className="text-muted-foreground">{t("duration")}</dt>
                      <dd className="font-medium">
                        {formatDuration(unit.media.durationSeconds)}
                      </dd>
                    </dl>
                    <dl>
                      <dt className="text-muted-foreground">{t("captions")}</dt>
                      <dd className="font-medium">
                        {unit.media.captions.length}
                      </dd>
                    </dl>
                  </CardContent>
                </Card>
                <FieldGroup>
                  <Field data-invalid={Boolean(videoErrors.manifestPath)}>
                    <FieldLabel htmlFor="manage-lesson-manifest">
                      {t("manifestPath")}
                    </FieldLabel>
                    <Input
                      id="manage-lesson-manifest"
                      dir="ltr"
                      value={video.manifestPath}
                      onChange={(event) =>
                        setVideo({ ...video, manifestPath: event.target.value })
                      }
                      aria-invalid={Boolean(videoErrors.manifestPath)}
                    />
                    <FieldDescription>{t("technicalPath")}</FieldDescription>
                    <FieldError>{videoErrors.manifestPath}</FieldError>
                  </Field>
                  <Field data-invalid={Boolean(videoErrors.encodingVersion)}>
                    <FieldLabel htmlFor="manage-lesson-encoding">
                      {t("encodingVersion")}
                    </FieldLabel>
                    <Input
                      id="manage-lesson-encoding"
                      dir="ltr"
                      value={video.encodingVersion}
                      onChange={(event) =>
                        setVideo({
                          ...video,
                          encodingVersion: event.target.value,
                        })
                      }
                      aria-invalid={Boolean(videoErrors.encodingVersion)}
                    />
                    <FieldError>{videoErrors.encodingVersion}</FieldError>
                  </Field>
                  <Field data-invalid={Boolean(videoErrors.checksumSha256)}>
                    <FieldLabel htmlFor="manage-lesson-checksum">
                      {t("packageChecksum")} ({t("optional")})
                    </FieldLabel>
                    <Input
                      id="manage-lesson-checksum"
                      dir="ltr"
                      value={video.checksumSha256}
                      onChange={(event) =>
                        setVideo({
                          ...video,
                          checksumSha256: event.target.value,
                        })
                      }
                      aria-invalid={Boolean(videoErrors.checksumSha256)}
                    />
                    <FieldError>{videoErrors.checksumSha256}</FieldError>
                  </Field>
                </FieldGroup>
                <FieldError>{videoErrors.form}</FieldError>
                {busy && (
                  <Progress value={progress} aria-label={t("uploadProgress")}>
                    <ProgressLabel>{t("uploadProgress")}</ProgressLabel>
                    <ProgressValue />
                  </Progress>
                )}
                <DialogFooter>
                  <Button type="submit" disabled={busy || !videoDirty}>
                    <FileArrowUpIcon
                      data-icon="inline-start"
                      aria-hidden="true"
                    />
                    {busy ? t("loading") : t("replaceVideo")}
                  </Button>
                </DialogFooter>
              </form>
              <MediaVersionHistory
                contentId={content.id}
                unit={unit}
                open={open && tab === "video"}
                onSaved={onSaved}
              />
            </TabsContent>

            <TabsContent value="captions" className="flex flex-col gap-5">
              <form
                className="flex flex-col gap-5"
                onSubmit={saveCaptions}
                noValidate
              >
                <CaptionTrackEditor
                  value={captions}
                  onChange={setCaptions}
                  disabled={busy}
                  onUpload={onCaptionUpload}
                />
                <FieldError>{captionError}</FieldError>
                <DialogFooter>
                  <Button type="submit" disabled={busy}>
                    <FloppyDiskIcon
                      data-icon="inline-start"
                      aria-hidden="true"
                    />
                    {busy ? t("loading") : t("saveChanges")}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            <TabsContent value="attachments" className="flex flex-col gap-5">
              <AttachmentManager
                unit={unit}
                onChange={(next) => onAttachmentsChanged?.(next)}
              />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
