import * as React from "react"
import {
  ArrowCounterClockwiseIcon,
  PlusIcon,
  TrashIcon,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FieldError } from "@/components/ui/field"
import {
  deleteContentUnit,
  getAdminContentById,
  getDeletedContentUnits,
  restoreContentUnit,
} from "@/lib/api"
import { useLocale } from "@/lib/locale-context"
import { lessonNumber } from "@/lib/curriculum"
import { toast } from "@/components/ui/toast"
import { AddLessonSheet } from "./add-lesson-sheet"
import { LessonDialog } from "./lesson-dialog"
import type { ContentUnit, LearningContent } from "@/types/content"

export function LessonManagement({
  content,
  selectedLessonId,
  onChanged,
  onCaptionUpload,
}: {
  content: LearningContent
  selectedLessonId?: string
  onChanged: (content: LearningContent) => void
  onCaptionUpload?: (file: File) => Promise<string>
}) {
  const { locale, t } = useLocale()
  const [managingLessonId, setManagingLessonId] = React.useState<string | null>(
    null
  )
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
      if (selected) setManagingLessonId(selected.id)
    }
  }, [content.units, selectedLessonId])

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
    unitId: string,
    next: ContentUnit["attachments"]
  ) => {
    onChanged({
      ...content,
      units: content.units.map((item) =>
        item.id === unitId ? { ...item, attachments: next } : item
      ),
    })
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
                        {Math.round(unit.media.durationSeconds / 60)}m ·{" "}
                        {(unit.attachments ?? []).length} {t("attachments")}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setManagingLessonId(unit.id)}
                      >
                        {t("manageLesson")}
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
        onCaptionUpload={onCaptionUpload}
      />
      <LessonDialog
        content={content}
        unit={
          managingLessonId
            ? (content.units.find((unit) => unit.id === managingLessonId) ??
              null)
            : null
        }
        open={managingLessonId !== null}
        onOpenChange={(open) => !open && setManagingLessonId(null)}
        onSaved={onChanged}
        onCaptionUpload={onCaptionUpload}
        onAttachmentsChanged={(next) => {
          if (managingLessonId) changeAttachments(managingLessonId, next)
        }}
      />
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
