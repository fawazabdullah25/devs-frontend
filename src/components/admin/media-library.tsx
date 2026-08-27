import * as React from "react"
import {
  ArrowCounterClockwiseIcon,
  ArrowSquareOutIcon,
  EyeIcon,
  FilmStripIcon,
  InfoIcon,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { deleteMedia, restoreMedia } from "@/lib/api"
import { useLocale } from "@/lib/locale-context"
import { toast } from "@/components/ui/toast"
import { formatDuration, localize } from "@/types/content"
import type { Locale, MediaLibraryItem } from "@/types/content"

type View = "active" | "trash"

export function MediaLibrary({
  active,
  deleted,
  locale,
  onChanged,
}: {
  active: MediaLibraryItem[]
  deleted: MediaLibraryItem[]
  locale: Locale
  onChanged: () => void
}) {
  const { t } = useLocale()
  const [view, setView] = React.useState<View>("active")
  const [inspect, setInspect] = React.useState<MediaLibraryItem | null>(null)
  const [deleteTarget, setDeleteTarget] =
    React.useState<MediaLibraryItem | null>(null)
  const [busy, setBusy] = React.useState<string | null>(null)
  const items = view === "active" ? active : deleted

  const remove = async () => {
    if (!deleteTarget) return
    setBusy(deleteTarget.id)
    try {
      await deleteMedia(deleteTarget.id)
      setDeleteTarget(null)
      onChanged()
      toast.add({ title: t("moveToTrash"), type: "success" })
    } catch (caught) {
      toast.add({
        title: t("saveFailed"),
        description: caught instanceof Error ? caught.message : t("saveFailed"),
        type: "error",
      })
    } finally {
      setBusy(null)
    }
  }

  const restore = async (item: MediaLibraryItem) => {
    setBusy(item.id)
    try {
      await restoreMedia(item.id)
      onChanged()
      toast.add({ title: t("restore"), type: "success" })
    } catch (caught) {
      toast.add({
        title: t("saveFailed"),
        description: caught instanceof Error ? caught.message : t("saveFailed"),
        type: "error",
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ToggleGroup
          value={[view]}
          onValueChange={(values) => values[0] && setView(values[0] as View)}
          variant="outline"
          aria-label={t("mediaInboxTitle")}
        >
          <ToggleGroupItem value="active">{t("active")}</ToggleGroupItem>
          <ToggleGroupItem value="trash">
            <TrashIcon data-icon="inline-start" aria-hidden="true" />
            {t("trash")}
          </ToggleGroupItem>
        </ToggleGroup>
        <p className="text-sm text-muted-foreground">
          {items.length} {t("media")}
        </p>
      </div>
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>
            {view === "active" ? t("mediaInboxTitle") : t("mediaTrash")}
          </CardTitle>
          <CardDescription>{t("mediaInboxDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {items.length ? (
            <div className="divide-y">
              {items.map((item) => (
                <MediaRow
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  locale={locale}
                  view={view}
                  busy={busy === item.id}
                  onInspect={() => setInspect(item)}
                  onDelete={() => setDeleteTarget(item)}
                  onRestore={() => void restore(item)}
                />
              ))}
            </div>
          ) : (
            <Empty className="border-0 py-14">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FilmStripIcon />
                </EmptyMedia>
                <EmptyTitle>
                  {view === "active" ? t("noMediaTitle") : t("mediaTrash")}
                </EmptyTitle>
                <EmptyDescription>
                  {view === "active"
                    ? t("mediaInboxDescription")
                    : t("noTrashMedia")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(inspect)}
        onOpenChange={(open) => !open && setInspect(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{inspect?.title}</DialogTitle>
            <DialogDescription>{t("technicalPath")}</DialogDescription>
          </DialogHeader>
          {inspect && <MediaInspect item={inspect} locale={locale} />}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("moveToTrash")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.attachedUnitId
                ? t("cannotDeleteAttached")
                : t("moveToTrashContentDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={Boolean(deleteTarget?.attachedUnitId) || Boolean(busy)}
              onClick={() => void remove()}
            >
              {t("moveToTrash")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function MediaRow({
  item,
  locale,
  view,
  busy,
  onInspect,
  onDelete,
  onRestore,
}: {
  item: MediaLibraryItem
  locale: Locale
  view: View
  busy: boolean
  onInspect: () => void
  onDelete: () => void
  onRestore: () => void
}) {
  const { t } = useLocale()
  const attached = Boolean(item.attachedUnitId)
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{item.title}</p>
          <Badge variant={item.status === "READY" ? "default" : "secondary"}>
            {item.status}
          </Badge>
          {item.provider && <Badge variant="outline">{item.provider}</Badge>}
          <Badge variant="outline">
            {item.kind === "VIDEO" ? t("lesson") : t("attachments")}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {attached
            ? `${item.lessonNumber ? `${item.lessonNumber} · ` : ""}${localize(item.attachedContentTitle!, locale)} / ${localize(item.attachedUnitTitle!, locale)}`
            : t("unattached")}
          {item.durationSeconds
            ? ` · ${formatDuration(item.durationSeconds)}`
            : ""}
          {item.encodingVersion ? ` · ${item.encodingVersion}` : ""}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {item.captions.length
            ? `${t("captions")}: ${item.captions.map((caption) => caption.label).join(", ")}`
            : `${t("captions")}: ${t("noAttachmentsCount")}`}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
        <Button type="button" size="sm" variant="outline" onClick={onInspect}>
          <EyeIcon data-icon="inline-start" aria-hidden="true" />
          {t("inspect")}
        </Button>
        {view === "trash" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={onRestore}
          >
            <ArrowCounterClockwiseIcon
              data-icon="inline-start"
              aria-hidden="true"
            />
            {t("restore")}
          </Button>
        ) : attached ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled
            title={t("cannotDeleteAttached")}
          >
            <InfoIcon data-icon="inline-start" aria-hidden="true" />
            {t("attached")}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={onDelete}
          >
            <TrashIcon data-icon="inline-start" aria-hidden="true" />
            {t("moveToTrash")}
          </Button>
        )}
      </div>
    </div>
  )
}

function MediaInspect({
  item,
  locale,
}: {
  item: MediaLibraryItem
  locale: Locale
}) {
  const { t } = useLocale()
  const rows = [
    [t("status"), item.status],
    [t("provider"), item.provider ?? "—"],
    [
      t("destination"),
      item.attachedUnitId
        ? `${item.lessonNumber ?? ""} · ${localize(item.attachedContentTitle!, locale)} / ${localize(item.attachedUnitTitle!, locale)}`
        : t("unattached"),
    ],
    [
      t("duration"),
      item.durationSeconds ? formatDuration(item.durationSeconds) : "—",
    ],
    [t("encoding"), item.encodingVersion ?? "—"],
    [
      t("captions"),
      item.captions.map((caption) => caption.label).join(", ") || "—",
    ],
    [t("technicalPath"), item.technicalPath ?? "—"],
    [
      t("updated"),
      item.updatedAt ? new Date(item.updatedAt).toLocaleString(locale) : "—",
    ],
  ]
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0 border bg-muted/20 p-3">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-1 text-sm font-medium break-words">{value}</dd>
        </div>
      ))}
      {item.attachedUnitId && (
        <Button
          render={
            <a
              href={`/${locale}/admin/content/${item.attachedContentId}?tab=curriculum&lesson=${item.attachedUnitId}`}
            />
          }
          nativeButton={false}
          variant="outline"
          className="sm:col-span-2"
        >
          <ArrowSquareOutIcon data-icon="inline-start" aria-hidden="true" />
          {t("replaceThroughLesson")}
        </Button>
      )}
    </dl>
  )
}
