import * as React from "react"
import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  ArrowSquareOutIcon,
  BookOpenIcon,
  DotsThreeIcon,
  NotePencilIcon,
  PaperPlaneTiltIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import { Link } from "@tanstack/react-router"

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  archiveContent,
  deleteContent,
  publishContent,
  restoreContent,
  unarchiveContent,
} from "@/lib/api"
import { useLocale } from "@/lib/locale-context"
import { localize } from "@/types/content"
import { toast } from "@/components/ui/toast"
import type { LearningContent, Locale } from "@/types/content"

type ContentView = "active" | "trash"

export function ContentLibrary({
  content,
  deletedContent,
  locale,
  onCreate,
  onChanged,
}: {
  content: LearningContent[]
  deletedContent: LearningContent[]
  locale: Locale
  onCreate: () => void
  onChanged: () => void
}) {
  const { t } = useLocale()
  const [view, setView] = React.useState<ContentView>("active")
  const [target, setTarget] = React.useState<{
    item: LearningContent
    action: "archive" | "trash"
  } | null>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)

  const run = async (
    item: LearningContent,
    action: "publish" | "archive" | "unarchive" | "restore"
  ) => {
    setBusyId(item.id)
    try {
      if (action === "publish") await publishContent(item.id)
      if (action === "archive") await archiveContent(item.id)
      if (action === "unarchive") await unarchiveContent(item.id)
      if (action === "restore") await restoreContent(item.id)
      onChanged()
    } catch (caught) {
      toast.add({
        title: t("saveFailed"),
        description: caught instanceof Error ? caught.message : t("saveFailed"),
        type: "error",
      })
    } finally {
      setBusyId(null)
    }
  }

  const confirmDestructive = async () => {
    if (!target) return
    setBusyId(target.item.id)
    try {
      if (target.action === "archive") await archiveContent(target.item.id)
      else await deleteContent(target.item.id)
      setTarget(null)
      onChanged()
    } catch (caught) {
      toast.add({
        title: t("saveFailed"),
        description: caught instanceof Error ? caught.message : t("saveFailed"),
        type: "error",
      })
    } finally {
      setBusyId(null)
    }
  }

  const items = view === "active" ? content : deletedContent

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ToggleGroup
          value={[view]}
          onValueChange={(values) =>
            values[0] && setView(values[0] as ContentView)
          }
          variant="outline"
          aria-label={t("contentLibrary")}
        >
          <ToggleGroupItem value="active">{t("active")}</ToggleGroupItem>
          <ToggleGroupItem value="trash">
            <TrashIcon data-icon="inline-start" aria-hidden="true" />
            {t("trash")}
          </ToggleGroupItem>
        </ToggleGroup>
        {view === "active" && (
          <Button type="button" onClick={onCreate}>
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            {t("newContent")}
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>
            {view === "active" ? t("contentLibrary") : t("trash")}
          </CardTitle>
          <CardDescription>
            {view === "active"
              ? t("contentLibraryDescription")
              : t("contentTrashDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {items.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-6">{t("title")}</TableHead>
                  <TableHead>{t("kind")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("visibility")}</TableHead>
                  <TableHead>
                    {view === "trash" ? t("restoreDeadline") : t("updated")}
                  </TableHead>
                  <TableHead className="pe-6 text-end">
                    {t("actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-72 ps-6 whitespace-normal">
                      <Link
                        to="/$locale/admin/content/$contentId"
                        params={{ locale, contentId: item.id }}
                        search={{}}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {localize(item.title, locale)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {item.kind === "COURSE" ? t("course") : t("series")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>{visibilityLabel(item.visibility, t)}</TableCell>
                    <TableCell>
                      {view === "trash"
                        ? formatDate(
                            item.purgeAfter,
                            locale,
                            t("retainedSevenDays")
                          )
                        : formatDate(
                            item.publishedAt,
                            locale,
                            t("noPublishDate")
                          )}
                    </TableCell>
                    <TableCell className="pe-6 text-end">
                      <ContentActions
                        item={item}
                        locale={locale}
                        view={view}
                        busy={busyId === item.id}
                        onPublish={() => void run(item, "publish")}
                        onArchive={() => setTarget({ item, action: "archive" })}
                        onUnarchive={() => void run(item, "unarchive")}
                        onRestore={() => void run(item, "restore")}
                        onTrash={() => setTarget({ item, action: "trash" })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Empty className="border-0 py-14">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BookOpenIcon />
                </EmptyMedia>
                <EmptyTitle>
                  {view === "active" ? t("contentLibrary") : t("trash")}
                </EmptyTitle>
                <EmptyDescription>
                  {view === "active"
                    ? t("contentLibraryDescription")
                    : t("noTrashContent")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(target)}
        onOpenChange={(open) => !open && setTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {target?.action === "archive"
                ? t("archiveTitle")
                : t("moveToTrashContent")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target?.action === "archive"
                ? t("archiveDescription")
                : t("moveToTrashContentDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={Boolean(busyId)}
              onClick={() => void confirmDestructive()}
            >
              {target?.action === "archive"
                ? t("confirmArchive")
                : t("moveToTrash")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ContentActions({
  item,
  locale,
  view,
  busy,
  onPublish,
  onArchive,
  onUnarchive,
  onRestore,
  onTrash,
}: {
  item: LearningContent
  locale: Locale
  view: ContentView
  busy: boolean
  onPublish: () => void
  onArchive: () => void
  onUnarchive: () => void
  onRestore: () => void
  onTrash: () => void
}) {
  const { t } = useLocale()
  if (view === "trash") {
    return (
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
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={busy}
          />
        }
      >
        <DotsThreeIcon aria-hidden="true" />
        <span className="sr-only">{t("moreActions")}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          render={
            <Link
              to="/$locale/admin/content/$contentId"
              params={{ locale, contentId: item.id }}
              search={{}}
            />
          }
          nativeButton={false}
        >
          <NotePencilIcon />
          {t("edit")}
        </DropdownMenuItem>
        {item.status !== "PUBLISHED" && (
          <DropdownMenuItem onClick={onPublish}>
            <PaperPlaneTiltIcon />
            {t("publish")}
          </DropdownMenuItem>
        )}
        {item.status === "PUBLISHED" && (
          <DropdownMenuItem
            render={
              <a
                href={`/${locale}/${item.kind === "COURSE" ? "courses" : "series"}/${item.slug}`}
              />
            }
            nativeButton={false}
          >
            <ArrowSquareOutIcon />
            {t("preview")}
          </DropdownMenuItem>
        )}
        {item.status === "ARCHIVED" ? (
          <DropdownMenuItem onClick={onUnarchive}>
            <ArrowCounterClockwiseIcon />
            {t("unarchive")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onArchive}>
            <ArchiveIcon />
            {t("archive")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem variant="destructive" onClick={onTrash}>
          <TrashIcon />
          {t("moveToTrash")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function StatusBadge({ status }: { status: LearningContent["status"] }) {
  const { t } = useLocale()
  return (
    <Badge
      variant={
        status === "PUBLISHED"
          ? "default"
          : status === "DRAFT"
            ? "secondary"
            : "outline"
      }
    >
      {status === "PUBLISHED"
        ? t("published")
        : status === "DRAFT"
          ? t("drafts")
          : t("archived")}
    </Badge>
  )
}

function visibilityLabel(
  visibility: LearningContent["visibility"],
  t: ReturnType<typeof useLocale>["t"]
) {
  return visibility === "PUBLIC"
    ? t("public")
    : visibility === "AUTHENTICATED"
      ? t("authenticated")
      : t("studentOnly")
}

function formatDate(
  value: string | undefined,
  locale: Locale,
  fallback: string
) {
  if (!value) return fallback
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    new Date(value)
  )
}
