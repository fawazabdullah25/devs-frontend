import * as React from "react"
import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
  CircleIcon,
  PaperPlaneTiltIcon,
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
import { useLocale } from "@/lib/locale-context"
import {
  archiveContent,
  deleteContent,
  publishContent,
  unarchiveContent,
} from "@/lib/api"
import { getPublishingReadiness } from "@/lib/admin-readiness"
import { toast } from "@/components/ui/toast"
import type { LearningContent } from "@/types/content"

type Action = "publish" | "archive" | "unarchive" | "trash"

export function ContentPublishing({
  content,
  onSaved,
  onDeleted,
}: {
  content: LearningContent
  onSaved: (content: LearningContent) => void
  onDeleted: () => void
}) {
  const { t } = useLocale()
  const [action, setAction] = React.useState<Action | null>(null)
  const [busy, setBusy] = React.useState(false)
  const readiness = getPublishingReadiness(content)

  const run = async () => {
    if (!action) return
    setBusy(true)
    try {
      if (action === "publish") onSaved(await publishContent(content.id))
      if (action === "archive") onSaved(await archiveContent(content.id))
      if (action === "unarchive") onSaved(await unarchiveContent(content.id))
      if (action === "trash") {
        await deleteContent(content.id)
        onDeleted()
      }
      setAction(null)
    } catch (caught) {
      toast.add({
        title: t("saveFailed"),
        description: caught instanceof Error ? caught.message : t("saveFailed"),
        type: "error",
      })
    } finally {
      setBusy(false)
    }
  }

  const checklist = [
    ["metadata", t("readinessMetadata"), readiness.metadata],
    ["cover", t("readinessCover"), readiness.cover],
    ["lessons", t("readinessLessonCount"), readiness.lessonCount],
    ["media", t("readinessMedia"), readiness.media],
    ["sections", t("readinessSections"), readiness.sections],
  ] as const

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{t("readiness")}</CardTitle>
            <CardDescription>{t("publishDescription")}</CardDescription>
          </div>
          <Badge variant={readiness.ready ? "default" : "secondary"}>
            {readiness.ready ? t("ready") : t("notReady")}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {checklist.map(([key, label, complete]) => (
            <div
              key={key}
              className="flex items-center gap-3 border bg-muted/10 p-3"
            >
              {complete ? (
                <CheckCircleIcon className="text-primary" aria-hidden="true" />
              ) : (
                <CircleIcon
                  className="text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              <span className="flex-1">{label}</span>
              <span className="text-xs text-muted-foreground">
                {complete ? t("ready") : t("notReady")}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("publishing")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {content.status !== "PUBLISHED" && (
            <Button
              disabled={!readiness.ready}
              onClick={() => setAction("publish")}
            >
              <PaperPlaneTiltIcon data-icon="inline-start" aria-hidden="true" />
              {t("publish")}
            </Button>
          )}
          {content.status === "ARCHIVED" ? (
            <Button variant="outline" onClick={() => setAction("unarchive")}>
              <ArrowCounterClockwiseIcon
                data-icon="inline-start"
                aria-hidden="true"
              />
              {t("unarchive")}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setAction("archive")}>
              <ArchiveIcon data-icon="inline-start" aria-hidden="true" />
              {t("archive")}
            </Button>
          )}
          <Button variant="destructive" onClick={() => setAction("trash")}>
            <TrashIcon data-icon="inline-start" aria-hidden="true" />
            {t("moveToTrash")}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(action)}
        onOpenChange={(open) => !open && setAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{actionTitle(action, t)}</AlertDialogTitle>
            <AlertDialogDescription>
              {actionDescription(action, t)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              variant={
                action === "trash" || action === "archive"
                  ? "destructive"
                  : "default"
              }
              onClick={() => void run()}
            >
              {action === "trash"
                ? t("moveToTrash")
                : action === "archive"
                  ? t("confirmArchive")
                  : action === "unarchive"
                    ? t("unarchive")
                    : t("publish")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function actionTitle(
  action: Action | null,
  t: ReturnType<typeof useLocale>["t"]
) {
  if (action === "archive") return t("archiveTitle")
  if (action === "trash") return t("moveToTrashContent")
  if (action === "unarchive") return t("unarchive")
  return t("publish")
}

function actionDescription(
  action: Action | null,
  t: ReturnType<typeof useLocale>["t"]
) {
  if (action === "archive") return t("archiveDescription")
  if (action === "trash") return t("moveToTrashContentDescription")
  if (action === "unarchive") return t("unarchiveDescription")
  return t("publishDescription")
}
