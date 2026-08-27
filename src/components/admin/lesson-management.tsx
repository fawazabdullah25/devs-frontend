import * as React from "react"
import {
  ArrowCounterClockwiseIcon,
  FileArrowUpIcon,
  PencilSimpleIcon,
  PaperclipIcon,
  PlusIcon,
  TrashIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  deleteContentUnit,
  getAdminContentById,
  getDeletedContentUnits,
  registerStaticHls,
  restoreContentUnit,
  replaceUnitMedia,
  updateContentUnit,
} from "@/lib/api"
import { useLocale } from "@/lib/locale-context"
import { lessonNumber } from "@/lib/curriculum"
import { toast } from "@/components/ui/toast"
import { AttachmentManager } from "@/components/attachment-manager"
import { AddLessonSheet } from "./add-lesson-sheet"
import { MediaVersionHistory } from "./media-version-history"
import type { ContentUnit, LearningContent } from "@/types/content"

export function LessonManagement({
  content,
  selectedLessonId,
  onChanged,
}: {
  content: LearningContent
  selectedLessonId?: string
  onChanged: (content: LearningContent) => void
}) {
  const { locale, t } = useLocale()
  const [editing, setEditing] = React.useState<ContentUnit | null>(null)
  const [replacing, setReplacing] = React.useState<ContentUnit | null>(null)
  const [attachments, setAttachments] = React.useState<ContentUnit | null>(null)
  const [trashTarget, setTrashTarget] = React.useState<ContentUnit | null>(null)
  const [addOpen, setAddOpen] = React.useState(false)
  const [lessonTab, setLessonTab] = React.useState<"active" | "trash">("active")
  const [deletedUnits, setDeletedUnits] = React.useState<ContentUnit[]>([])
  const [trashLoading, setTrashLoading] = React.useState(false)
  const [trashError, setTrashError] = React.useState("")
  const [restoringLessonId, setRestoringLessonId] = React.useState<
    string | null
  >(null)

  const loadDeleted = React.useCallback(async () => {
    setTrashLoading(true)
    setTrashError("")
    try {
      setDeletedUnits(await getDeletedContentUnits(content.id))
    } catch (caught) {
      setTrashError(caught instanceof Error ? caught.message : t("saveFailed"))
    } finally {
      setTrashLoading(false)
    }
  }, [content.id, t])

  React.useEffect(() => {
    void loadDeleted()
  }, [loadDeleted])

  React.useEffect(() => {
    if (selectedLessonId) {
      const selected = content.units.find(
        (unit) => unit.id === selectedLessonId
      )
      if (selected) setEditing(selected)
    }
  }, [content.units, selectedLessonId])

  const updateUnit = (saved: LearningContent) => {
    onChanged(saved)
    setEditing(null)
    setReplacing(null)
  }

  const remove = async () => {
    if (!trashTarget) return
    try {
      await deleteContentUnit(content.id, trashTarget.id)
      const saved = await getAdminContentById(content.id)
      if (!saved) throw new Error("Content not found after lesson deletion")
      onChanged(saved)
      await loadDeleted()
      setTrashTarget(null)
      toast.add({ title: t("moveLessonToTrash"), type: "success" })
    } catch (caught) {
      toast.add({
        title: t("saveFailed"),
        description: caught instanceof Error ? caught.message : t("saveFailed"),
        type: "error",
      })
    }
  }

  const restore = async (unit: ContentUnit) => {
    setRestoringLessonId(unit.id)
    try {
      await restoreContentUnit(content.id, unit.id)
      const saved = await getAdminContentById(content.id)
      if (!saved) throw new Error("Content not found after lesson restoration")
      onChanged(saved)
      await loadDeleted()
      toast.add({ title: t("restoreLesson"), type: "success" })
    } catch (caught) {
      setTrashError(caught instanceof Error ? caught.message : t("saveFailed"))
      toast.add({
        title: t("saveFailed"),
        description: caught instanceof Error ? caught.message : t("saveFailed"),
        type: "error",
      })
    } finally {
      setRestoringLessonId(null)
    }
  }

  const changeAttachments = (
    unit: ContentUnit,
    next: ContentUnit["attachments"]
  ) => {
    onChanged({
      ...content,
      units: content.units.map((item) =>
        item.id === unit.id ? { ...item, attachments: next } : item
      ),
    })
    setAttachments((current) =>
      current?.id === unit.id ? { ...unit, attachments: next } : current
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{t("currentLessons")}</CardTitle>
          <CardDescription>
            {content.kind === "COURSE"
              ? t("oneCourseVideo")
              : t("curriculumEditorDescription")}
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setAddOpen(true)}
          disabled={content.kind === "COURSE" && content.units.length >= 1}
          title={
            content.kind === "COURSE" && content.units.length >= 1
              ? t("courseOneLessonLimit")
              : undefined
          }
        >
          <PlusIcon data-icon="inline-start" aria-hidden="true" />
          {t("addLesson")}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Tabs
          value={lessonTab}
          onValueChange={(value) => setLessonTab(value as "active" | "trash")}
        >
          <TabsList variant="line" className="w-full justify-start sm:w-fit">
            <TabsTrigger value="active">{t("currentLessons")}</TabsTrigger>
            <TabsTrigger value="trash">
              {t("lessonTrash")} ({deletedUnits.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="mt-4 flex flex-col gap-3">
            {content.units.length ? (
              content.units
                .slice()
                .sort((a, b) => a.position - b.position)
                .map((unit) => (
                  <div
                    key={unit.id}
                    className="flex flex-col gap-3 border bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          {lessonNumber(content, unit.id)}
                        </Badge>
                        <p className="truncate font-medium">
                          {unit.title[locale] || unit.title.en}
                        </p>
                        <Badge
                          variant={
                            unit.media.status === "READY"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {unit.media.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {unit.media.provider} ·{" "}
                        {Math.round(unit.media.durationSeconds / 60)}m ·{" "}
                        {(unit.attachments ?? []).length} {t("attachments")}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(unit)}
                      >
                        <PencilSimpleIcon
                          data-icon="inline-start"
                          aria-hidden="true"
                        />
                        {t("editLesson")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setReplacing(unit)}
                      >
                        <UploadSimpleIcon
                          data-icon="inline-start"
                          aria-hidden="true"
                        />
                        {t("replaceVideo")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setAttachments(unit)}
                      >
                        <PaperclipIcon
                          data-icon="inline-start"
                          aria-hidden="true"
                        />
                        {t("attachments")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setTrashTarget(unit)}
                      >
                        <TrashIcon
                          data-icon="inline-start"
                          aria-hidden="true"
                        />
                        {t("moveToTrash")}
                      </Button>
                    </div>
                  </div>
                ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("noLessons")}
              </p>
            )}
          </TabsContent>
          <TabsContent value="trash" className="mt-4 flex flex-col gap-3">
            {trashError && <FieldError>{trashError}</FieldError>}
            {trashLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("loading")}
              </p>
            ) : deletedUnits.length ? (
              deletedUnits
                .slice()
                .sort((a, b) =>
                  (b.deletedAt ?? "").localeCompare(a.deletedAt ?? "")
                )
                .map((unit) => (
                  <DeletedLessonRow
                    key={unit.id}
                    unit={unit}
                    locale={locale}
                    restoring={restoringLessonId === unit.id}
                    onRestore={() => void restore(unit)}
                  />
                ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("noDeletedLessons")}
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <AddLessonSheet
        content={content}
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={(saved) => {
          onChanged(saved)
          setLessonTab("active")
        }}
      />
      <LessonEditSheet
        unit={editing}
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={updateUnit}
        contentId={content.id}
      />
      <StaticHlsReplaceSheet
        contentId={content.id}
        unit={replacing}
        open={Boolean(replacing)}
        onOpenChange={(open) => !open && setReplacing(null)}
        onSaved={updateUnit}
      />
      <Dialog
        open={Boolean(attachments)}
        onOpenChange={(open) => !open && setAttachments(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t("attachments")} ·{" "}
              {attachments &&
                (attachments.title[locale] || attachments.title.en)}
            </DialogTitle>
            <DialogDescription>{t("attachmentsDescription")}</DialogDescription>
          </DialogHeader>
          {attachments && (
            <AttachmentManager
              unit={attachments}
              onChange={(next) => changeAttachments(attachments, next)}
            />
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(trashTarget)}
        onOpenChange={(open) => !open && setTrashTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("moveLessonToTrash")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("moveToTrashContentDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void remove()}
            >
              {t("moveToTrash")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function deletedLessonDate(value: string | undefined, locale: "en" | "ar") {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function DeletedLessonRow({
  unit,
  locale,
  restoring,
  onRestore,
}: {
  unit: ContentUnit
  locale: "en" | "ar"
  restoring: boolean
  onRestore: () => void
}) {
  const { t } = useLocale()
  return (
    <div className="flex flex-col gap-3 border bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium">
          {unit.title[locale] || unit.title.en}
        </p>
        <dl className="mt-1 flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-4">
          <div>
            <dt className="inline font-medium text-foreground">
              {t("deletedOn")}:{" "}
            </dt>
            <dd className="inline">
              {deletedLessonDate(unit.deletedAt, locale)}
            </dd>
          </div>
          {unit.purgeAfter && (
            <div>
              <dt className="inline font-medium text-foreground">
                {t("restoreDeadline")}:{" "}
              </dt>
              <dd className="inline">
                {deletedLessonDate(unit.purgeAfter, locale)}
              </dd>
            </div>
          )}
        </dl>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={restoring}
        onClick={onRestore}
      >
        <ArrowCounterClockwiseIcon
          data-icon="inline-start"
          aria-hidden="true"
        />
        {restoring ? t("loading") : t("restoreLesson")}
      </Button>
    </div>
  )
}

function LessonEditSheet({
  unit,
  open,
  onOpenChange,
  onSaved,
  contentId,
}: {
  unit: ContentUnit | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (content: LearningContent) => void
  contentId: string
}) {
  const { t } = useLocale()
  const [title, setTitle] = React.useState("")
  const [titleAr, setTitleAr] = React.useState("")
  const [slug, setSlug] = React.useState("")
  const [summary, setSummary] = React.useState("")
  const [summaryAr, setSummaryAr] = React.useState("")
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!unit) return
    setTitle(unit.title.en)
    setTitleAr(unit.title.ar ?? "")
    setSlug(unit.slug)
    setSummary(unit.summary?.en ?? "")
    setSummaryAr(unit.summary?.ar ?? "")
    setError("")
  }, [unit])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!unit) return
    if (!title.trim() || !slug.trim()) {
      setError(t("requiredField"))
      return
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim())) {
      setError(t("invalidSlug"))
      return
    }
    setBusy(true)
    try {
      onSaved(
        await updateContentUnit(contentId, unit.id, {
          title: title.trim(),
          titleAr: titleAr.trim() || undefined,
          slug: slug.trim(),
          summary: summary.trim() || undefined,
          summaryAr: summaryAr.trim() || undefined,
        })
      )
      onOpenChange(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("saveFailed"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{t("editLesson")}</SheetTitle>
          <SheetDescription>{t("lessonDetails")}</SheetDescription>
        </SheetHeader>
        <form
          className="flex flex-1 flex-col gap-5 overflow-y-auto p-4"
          onSubmit={submit}
          noValidate
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="lesson-edit-title">
                {t("lessonTitle")}
              </FieldLabel>
              <Input
                id="lesson-edit-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                aria-invalid={Boolean(error && !title)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="lesson-edit-title-ar">
                {t("titleArabic")}
              </FieldLabel>
              <Input
                id="lesson-edit-title-ar"
                dir="rtl"
                value={titleAr}
                onChange={(event) => setTitleAr(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="lesson-edit-slug">
                {t("lessonSlug")}
              </FieldLabel>
              <Input
                id="lesson-edit-slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                aria-invalid={Boolean(error && !slug)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="lesson-edit-summary">
                {t("lessonSummary")}
              </FieldLabel>
              <Textarea
                id="lesson-edit-summary"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="lesson-edit-summary-ar">
                {t("summaryArabic")}
              </FieldLabel>
              <Textarea
                id="lesson-edit-summary-ar"
                dir="rtl"
                value={summaryAr}
                onChange={(event) => setSummaryAr(event.target.value)}
              />
            </Field>
          </FieldGroup>
          <FieldError>{error}</FieldError>
          <SheetFooter className="px-0">
            <Button type="submit" disabled={busy}>
              {busy ? t("loading") : t("saveChanges")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function StaticHlsReplaceSheet({
  contentId,
  unit,
  open,
  onOpenChange,
  onSaved,
}: {
  contentId: string
  unit: ContentUnit | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (content: LearningContent) => void
}) {
  const { t } = useLocale()
  const [manifestPath, setManifestPath] = React.useState("")
  const [duration, setDuration] = React.useState(0)
  const [encodingVersion, setEncodingVersion] = React.useState("")
  const [checksum, setChecksum] = React.useState("")
  const [error, setError] = React.useState<Record<string, string>>({})
  const [busy, setBusy] = React.useState(false)
  const [progress, setProgress] = React.useState(0)

  React.useEffect(() => {
    if (!unit) return
    setManifestPath(unit.media.technicalPath ?? "")
    setDuration(unit.media.durationSeconds)
    setEncodingVersion(unit.media.encodingVersion ?? "")
    setChecksum("")
    setError({})
  }, [unit])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!unit) return
    const next: Record<string, string> = {}
    if (!manifestPath.trim()) next.manifestPath = t("requiredField")
    if (!duration || duration <= 0) next.duration = t("invalidDuration")
    if (!encodingVersion.trim()) next.encodingVersion = t("requiredField")
    if (checksum.trim() && !/^[a-f\d]{64}$/i.test(checksum.trim()))
      next.checksum = t("invalidChecksum")
    setError(next)
    if (Object.keys(next).length) {
      document
        .getElementById(
          Object.keys(next)[0] === "duration"
            ? "replace-duration"
            : `replace-${Object.keys(next)[0]}`
        )
        ?.focus()
      return
    }
    setBusy(true)
    setProgress(20)
    try {
      const registered = await registerStaticHls({
        manifestPath: manifestPath.trim(),
        durationSeconds: duration,
        encodingVersion: encodingVersion.trim(),
        checksumSha256: checksum.trim() || undefined,
        captions: [],
      })
      setProgress(70)
      await replaceUnitMedia(contentId, unit.id, registered.mediaId)
      const saved = await getAdminContentById(contentId)
      if (!saved) throw new Error("Content not found after media replacement")
      onSaved(saved)
      setProgress(100)
      toast.add({ title: t("videoAttached"), type: "success" })
      onOpenChange(false)
    } catch (caught) {
      setError({
        form: caught instanceof Error ? caught.message : t("uploadFailed"),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{t("replaceVideo")}</SheetTitle>
          <SheetDescription>{t("onlyStaticHlsDescription")}</SheetDescription>
        </SheetHeader>
        <form
          className="flex flex-1 flex-col gap-5 overflow-y-auto p-4"
          onSubmit={submit}
          noValidate
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="replace-manifestPath">
                {t("manifestPath")}
              </FieldLabel>
              <Input
                id="replace-manifestPath"
                value={manifestPath}
                onChange={(event) => setManifestPath(event.target.value)}
                aria-invalid={Boolean(error.manifestPath)}
              />
              <FieldDescription>{t("technicalPath")}</FieldDescription>
              <FieldError>{error.manifestPath}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="replace-duration">
                {t("durationSeconds")}
              </FieldLabel>
              <Input
                id="replace-duration"
                type="number"
                min={1}
                value={duration || ""}
                onChange={(event) => setDuration(Number(event.target.value))}
                aria-invalid={Boolean(error.duration)}
              />
              <FieldError>{error.duration}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="replace-encodingVersion">
                {t("encodingVersion")}
              </FieldLabel>
              <Input
                id="replace-encodingVersion"
                value={encodingVersion}
                onChange={(event) => setEncodingVersion(event.target.value)}
                aria-invalid={Boolean(error.encodingVersion)}
              />
              <FieldError>{error.encodingVersion}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="replace-checksum">
                {t("packageChecksum")} ({t("optional")})
              </FieldLabel>
              <Input
                id="replace-checksum"
                value={checksum}
                onChange={(event) => setChecksum(event.target.value)}
                aria-invalid={Boolean(error.checksum)}
              />
              <FieldError>{error.checksum}</FieldError>
            </Field>
          </FieldGroup>
          <FieldError>{error.form}</FieldError>
          {busy && (
            <Progress value={progress} aria-label={t("uploadProgress")}>
              <ProgressLabel>{t("uploadProgress")}</ProgressLabel>
              <ProgressValue />
            </Progress>
          )}
          <SheetFooter className="px-0">
            <Button type="submit" disabled={busy}>
              <FileArrowUpIcon data-icon="inline-start" aria-hidden="true" />
              {t("replaceVideo")}
            </Button>
          </SheetFooter>
        </form>
        <div className="p-4 pt-0">
          <MediaVersionHistory
            contentId={contentId}
            unit={unit}
            open={open}
            onSaved={onSaved}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
