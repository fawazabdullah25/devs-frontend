import * as React from "react"
import {
  ArchiveIcon,
  ArrowSquareOutIcon,
  BookOpenIcon,
  ChartBarIcon,
  CloudArrowUpIcon,
  DotsThreeIcon,
  EyeIcon,
  FilmStripIcon,
  GearIcon,
  ListIcon,
  NotePencilIcon,
  PaperPlaneTiltIcon,
  PlusIcon,
  ShieldCheckIcon,
  SpinnerGapIcon,
  UploadSimpleIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react"
import { createFileRoute } from "@tanstack/react-router"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { AttachmentManager } from "@/components/attachment-manager"
import {
  addContentUnit,
  archiveContent,
  createDraft,
  getAdminContent,
  getAdminSummary,
  publishContent,
  registerStaticHls,
  requestMediaUpload,
  startMediaIngest,
  updateDraft,
  uploadMediaSource,
} from "@/lib/api"
import { useLocale } from "@/lib/locale-context"
import { localize } from "@/types/content"
import type {
  ContentVisibility,
  LearningContent,
  Locale,
} from "@/types/content"

export const Route = createFileRoute("/$locale/admin")({
  ssr: false,
  loader: async () => {
    const [summary, content] = await Promise.all([
      getAdminSummary(),
      getAdminContent(),
    ])
    return { summary, content }
  },
  component: AdminPage,
})

function AdminPage() {
  const initial = Route.useLoaderData()
  const { locale, t } = useLocale()
  const [content, setContent] = React.useState(initial.content)
  const [editorOpen, setEditorOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<LearningContent | null>(null)
  const [managing, setManaging] = React.useState<LearningContent | null>(null)
  const [archiveTarget, setArchiveTarget] =
    React.useState<LearningContent | null>(null)
  const [changingStatus, startStatusChange] = React.useTransition()
  const [section, setSection] = React.useState<AdminSection>("dashboard")
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)
  const summary = React.useMemo(
    () => ({
      ...initial.summary,
      published: content.filter((item) => item.status === "PUBLISHED").length,
      drafts: content.filter((item) => item.status === "DRAFT").length,
      archived: content.filter((item) => item.status === "ARCHIVED").length,
      processingMedia: content
        .flatMap((item) => item.units)
        .filter((unit) => unit.media.status === "PROCESSING").length,
      views: content.reduce((total, item) => total + item.views, 0),
      watchedMinutes: content.reduce(
        (total, item) => total + item.watchedMinutes,
        0
      ),
    }),
    [content, initial.summary]
  )

  const handleSaved = (saved: LearningContent) => {
    setContent((current) => {
      const exists = current.some((item) => item.id === saved.id)
      return exists
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...current]
    })
    setEditorOpen(false)
    setEditing(null)
  }

  const openEdit = (item: LearningContent) => {
    setEditing(item)
    setEditorOpen(true)
  }

  const replaceContent = (saved: LearningContent) => {
    setContent((current) =>
      current.map((item) => (item.id === saved.id ? saved : item))
    )
    setManaging((current) => (current?.id === saved.id ? saved : current))
  }

  const handlePublish = (item: LearningContent) => {
    startStatusChange(async () => {
      try {
        const saved = await publishContent(item.id)
        replaceContent(saved)
        toast.add({ title: t("publishComplete"), type: "success" })
      } catch (error) {
        toast.add({
          title: t("saveFailed"),
          description:
            error instanceof Error ? error.message : "Please try again.",
          type: "error",
        })
      }
    })
  }

  const handleArchive = () => {
    if (!archiveTarget) return
    startStatusChange(async () => {
      try {
        const saved = await archiveContent(archiveTarget.id)
        replaceContent(saved)
        setArchiveTarget(null)
        toast.add({ title: t("archiveComplete"), type: "success" })
      } catch (error) {
        toast.add({
          title: t("saveFailed"),
          description:
            error instanceof Error ? error.message : "Please try again.",
          type: "error",
        })
      }
    })
  }

  const preview = (item: LearningContent) => {
    const path = item.kind === "COURSE" ? "courses" : "series"
    window.open(
      `/${locale}/${path}/${item.slug}`,
      "_blank",
      "noopener,noreferrer"
    )
  }

  const heading = adminHeading(section, t)
  const sections: AdminNavigationItem[] = [
    { value: "dashboard", icon: ChartBarIcon, label: t("dashboard") },
    { value: "content", icon: BookOpenIcon, label: t("content") },
    { value: "media", icon: FilmStripIcon, label: t("media") },
    { value: "team", icon: UsersThreeIcon, label: t("team") },
    { value: "settings", icon: GearIcon, label: t("settings") },
  ]

  return (
    <Tabs
      orientation="vertical"
      value={section}
      onValueChange={(value) => setSection(value as AdminSection)}
    >
      <div className="content-shell py-10 sm:py-14">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger
            render={<Button variant="outline" className="mb-6 lg:hidden" />}
          >
            <ListIcon data-icon="inline-start" />
            {t("adminMenu")}
          </SheetTrigger>
          <SheetContent side={locale === "ar" ? "right" : "left"}>
            <SheetHeader>
              <SheetTitle>{t("adminMenu")}</SheetTitle>
              <SheetDescription>{t("adminDescription")}</SheetDescription>
            </SheetHeader>
            <nav
              className="flex flex-col gap-1 px-4"
              aria-label={t("adminMenu")}
            >
              {sections.map((item) => (
                <Button
                  key={item.value}
                  variant={section === item.value ? "secondary" : "ghost"}
                  className="justify-start"
                  onClick={() => {
                    setSection(item.value)
                    setMobileNavOpen(false)
                  }}
                >
                  <item.icon data-icon="inline-start" />
                  {item.label}
                </Button>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <div className="grid gap-8 lg:grid-cols-[210px_minmax(0,1fr)]">
          <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
            <Card className="py-3">
              <CardContent className="px-3">
                <TabsList className="h-auto w-full flex-col items-stretch justify-start bg-transparent p-0">
                  {sections.map((item) => (
                    <AdminNav key={item.value} {...item} />
                  ))}
                </TabsList>
              </CardContent>
            </Card>
          </aside>

          <main className="min-w-0">
            <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex max-w-2xl flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  {heading.title}
                </h1>
                <p className="text-muted-foreground">{heading.description}</p>
              </div>
              {section === "content" && (
                <Dialog
                  open={editorOpen}
                  onOpenChange={(open) => {
                    setEditorOpen(open)
                    if (!open) setEditing(null)
                  }}
                >
                  <DialogTrigger
                    render={<Button onClick={() => setEditing(null)} />}
                  >
                    <PlusIcon data-icon="inline-start" />
                    {t("newContent")}
                  </DialogTrigger>
                  <ContentEditor content={editing} onSaved={handleSaved} />
                </Dialog>
              )}
            </header>

            <TabsContent value="dashboard" className="mt-8 flex flex-col gap-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  icon={BookOpenIcon}
                  label={t("published")}
                  value={summary.published}
                />
                <MetricCard
                  icon={NotePencilIcon}
                  label={t("drafts")}
                  value={summary.drafts}
                />
                <MetricCard
                  icon={FilmStripIcon}
                  label={t("processing")}
                  value={summary.processingMedia}
                />
                <MetricCard
                  icon={EyeIcon}
                  label={t("views")}
                  value={summary.views.toLocaleString(locale)}
                />
              </div>
              <Alert className="py-3">
                <ShieldCheckIcon aria-hidden="true" />
                <AlertTitle>{t("accessReady")}</AlertTitle>
                <AlertDescription>
                  {t("accessReadyDescription")}
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="content" className="mt-8">
              <ContentLibrary
                content={content}
                locale={locale}
                changingStatus={changingStatus}
                onEdit={openEdit}
                onManage={setManaging}
                onPublish={handlePublish}
                onPreview={preview}
                onArchive={setArchiveTarget}
              />
            </TabsContent>

            <TabsContent value="media" className="mt-8">
              <MediaInbox content={content} onManage={setManaging} />
            </TabsContent>

            <TabsContent value="team" className="mt-8">
              <ComingSoon
                icon={UsersThreeIcon}
                title={t("teamComingSoonTitle")}
                description={t("teamComingSoonDescription")}
              />
            </TabsContent>

            <TabsContent value="settings" className="mt-8">
              <ComingSoon
                icon={GearIcon}
                title={t("settingsComingSoonTitle")}
                description={t("settingsComingSoonDescription")}
              />
            </TabsContent>

            <Dialog
              open={Boolean(managing)}
              onOpenChange={(open) => {
                if (!open) setManaging(null)
              }}
            >
              {managing && (
                <MediaWorkflow content={managing} onSaved={replaceContent} />
              )}
            </Dialog>

            <AlertDialog
              open={Boolean(archiveTarget)}
              onOpenChange={(open) => {
                if (!open) setArchiveTarget(null)
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("archiveTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("archiveDescription")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={changingStatus}
                    onClick={handleArchive}
                  >
                    {t("confirmArchive")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </main>
        </div>
      </div>
    </Tabs>
  )
}

type AdminSection = "dashboard" | "content" | "media" | "team" | "settings"

interface AdminNavigationItem {
  value: AdminSection
  icon: typeof ChartBarIcon
  label: string
}

function AdminNav({
  value,
  icon: Icon,
  label,
}: {
  value: AdminSection
  icon: typeof ChartBarIcon
  label: string
}) {
  return (
    <TabsTrigger value={value} className="w-full flex-none justify-start px-3">
      <Icon data-icon="inline-start" />
      {label}
    </TabsTrigger>
  )
}

function adminHeading(
  section: AdminSection,
  t: ReturnType<typeof useLocale>["t"]
) {
  if (section === "content") {
    return {
      title: t("contentLibrary"),
      description: t("contentLibraryDescription"),
    }
  }
  if (section === "media") {
    return {
      title: t("mediaInboxTitle"),
      description: t("mediaInboxDescription"),
    }
  }
  if (section === "team") {
    return {
      title: t("team"),
      description: t("teamComingSoonDescription"),
    }
  }
  if (section === "settings") {
    return {
      title: t("settings"),
      description: t("settingsComingSoonDescription"),
    }
  }
  return { title: t("adminTitle"), description: t("adminDescription") }
}

function ContentLibrary({
  content,
  locale,
  changingStatus,
  onEdit,
  onManage,
  onPublish,
  onPreview,
  onArchive,
}: {
  content: LearningContent[]
  locale: Locale
  changingStatus: boolean
  onEdit: (item: LearningContent) => void
  onManage: (item: LearningContent) => void
  onPublish: (item: LearningContent) => void
  onPreview: (item: LearningContent) => void
  onArchive: (item: LearningContent) => void
}) {
  const { t } = useLocale()

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{t("contentLibrary")}</CardTitle>
        <CardDescription>{t("contentLibraryDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {content.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="ps-6">{t("title")}</TableHead>
                <TableHead>{t("kind")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("visibility")}</TableHead>
                <TableHead>{t("updated")}</TableHead>
                <TableHead className="pe-6 text-end">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {content.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-72 ps-6 font-medium whitespace-normal">
                    <span className="line-clamp-2">
                      {localize(item.title, locale)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {item.kind === "COURSE" ? t("course") : t("series")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell>{visibilityLabel(item.visibility, t)}</TableCell>
                  <TableCell>
                    {item.publishedAt
                      ? new Intl.DateTimeFormat(locale, {
                          dateStyle: "medium",
                        }).format(new Date(item.publishedAt))
                      : t("noPublishDate")}
                  </TableCell>
                  <TableCell className="pe-6 text-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon-sm" />}
                      >
                        <DotsThreeIcon />
                        <span className="sr-only">{t("moreActions")}</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(item)}>
                          <NotePencilIcon />
                          {t("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onManage(item)}>
                          <UploadSimpleIcon />
                          {t("manageVideos")}
                        </DropdownMenuItem>
                        {item.status !== "PUBLISHED" && (
                          <DropdownMenuItem
                            disabled={changingStatus}
                            onClick={() => onPublish(item)}
                          >
                            <PaperPlaneTiltIcon />
                            {t("publish")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          disabled={item.status !== "PUBLISHED"}
                          onClick={() => onPreview(item)}
                        >
                          <ArrowSquareOutIcon />
                          {t("preview")}
                        </DropdownMenuItem>
                        {item.status !== "ARCHIVED" && (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onArchive(item)}
                          >
                            <ArchiveIcon />
                            {t("archive")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Empty className="border-0 py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BookOpenIcon />
              </EmptyMedia>
              <EmptyTitle>{t("contentLibrary")}</EmptyTitle>
              <EmptyDescription>
                {t("contentLibraryDescription")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  )
}

function MediaInbox({
  content,
  onManage,
}: {
  content: LearningContent[]
  onManage: (item: LearningContent) => void
}) {
  const { locale, t } = useLocale()

  if (!content.length) {
    return (
      <Card>
        <CardContent>
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FilmStripIcon />
              </EmptyMedia>
              <EmptyTitle>{t("noMediaTitle")}</EmptyTitle>
              <EmptyDescription>{t("noMediaDescription")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {content.map((item) => {
        const cannotAdd =
          item.status === "ARCHIVED" ||
          (item.kind === "COURSE" && item.units.length >= 1)
        return (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <CardTitle className="truncate">
                    {localize(item.title, locale)}
                  </CardTitle>
                  <CardDescription>
                    {item.kind === "COURSE" ? t("course") : t("series")} ·{" "}
                    {item.units.length} {t("lessons")}
                  </CardDescription>
                </div>
                <StatusBadge status={item.status} />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {item.units.length ? (
                item.units.map((unit) => (
                  <div
                    key={unit.id}
                    className="flex items-center gap-3 border bg-muted/30 p-3"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {unit.position}. {localize(unit.title, locale)}
                    </span>
                    <Badge
                      variant={
                        unit.media.status === "READY" ? "default" : "secondary"
                      }
                    >
                      {unit.media.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("noLessons")}
                </p>
              )}
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                disabled={cannotAdd}
                onClick={() => onManage(item)}
              >
                <UploadSimpleIcon data-icon="inline-start" />
                {t("addVideo")}
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}

function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof GearIcon
  title: string
  description: string
}) {
  const { t } = useLocale()
  return (
    <Card>
      <CardContent>
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Icon />
            </EmptyMedia>
            <Badge variant="secondary">{t("comingSoon")}</Badge>
            <EmptyTitle>{title}</EmptyTitle>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
    </Card>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpenIcon
  label: string
  value: number | string
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardDescription>{label}</CardDescription>
        <Icon className="size-5 text-primary" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: LearningContent["status"] }) {
  const { t } = useLocale()
  const label =
    status === "PUBLISHED"
      ? t("published")
      : status === "DRAFT"
        ? t("drafts")
        : t("archived")
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
      {label}
    </Badge>
  )
}

type MediaStage =
  "idle" | "uploading" | "ingesting" | "registering" | "attaching" | "done"
type MediaSourceKind = "STATIC_HLS" | "MUX"

function MediaWorkflow({
  content,
  onSaved,
}: {
  content: LearningContent
  onSaved: (saved: LearningContent) => void
}) {
  const { locale, t } = useLocale()
  const [sourceKind, setSourceKind] =
    React.useState<MediaSourceKind>("STATIC_HLS")
  const [file, setFile] = React.useState<File | null>(null)
  const [manifestPath, setManifestPath] = React.useState("")
  const [durationSeconds, setDurationSeconds] = React.useState(3600)
  const [encodingVersion, setEncodingVersion] = React.useState("")
  const [checksumSha256, setChecksumSha256] = React.useState("")
  const [englishCaptionPath, setEnglishCaptionPath] = React.useState("")
  const [arabicCaptionPath, setArabicCaptionPath] = React.useState("")
  const [title, setTitle] = React.useState("")
  const [slug, setSlug] = React.useState("")
  const [slugEdited, setSlugEdited] = React.useState(false)
  const [position, setPosition] = React.useState(
    Math.max(0, ...content.units.map((unit) => unit.position)) + 1
  )
  const [stage, setStage] = React.useState<MediaStage>("idle")
  const [progress, setProgress] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)
  const busy = stage !== "idle" && stage !== "done"
  const courseHasVideo = content.kind === "COURSE" && content.units.length >= 1

  React.useEffect(() => {
    setPosition(Math.max(0, ...content.units.map((unit) => unit.position)) + 1)
  }, [content.units])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    const invalidCommon =
      !title.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    const invalidStaticHls =
      sourceKind === "STATIC_HLS" &&
      (!manifestPath.trim() ||
        !encodingVersion.trim() ||
        durationSeconds <= 0 ||
        (checksumSha256.length > 0 &&
          !/^[a-fA-F0-9]{64}$/.test(checksumSha256)))
    if (invalidCommon || invalidStaticHls || (sourceKind === "MUX" && !file)) {
      setError(t("requiredField"))
      return
    }

    try {
      let mediaId: string
      if (sourceKind === "STATIC_HLS") {
        setStage("registering")
        setProgress(45)
        const registered = await registerStaticHls({
          manifestPath: manifestPath.trim(),
          durationSeconds,
          encodingVersion: encodingVersion.trim(),
          checksumSha256: checksumSha256.trim() || undefined,
          captions: [
            englishCaptionPath.trim()
              ? {
                  language: "en",
                  label: "English",
                  path: englishCaptionPath.trim(),
                  defaultTrack: false,
                }
              : null,
            arabicCaptionPath.trim()
              ? {
                  language: "ar",
                  label: "العربية",
                  path: arabicCaptionPath.trim(),
                  defaultTrack: false,
                }
              : null,
          ].filter((caption) => caption !== null),
        })
        mediaId = registered.mediaId
      } else {
        setStage("uploading")
        setProgress(2)
        const grant = await requestMediaUpload(file!)
        await uploadMediaSource(grant, file!, (percentage) =>
          setProgress(Math.max(2, Math.round(percentage * 0.75)))
        )
        setStage("ingesting")
        setProgress(82)
        await startMediaIngest(grant.mediaId)
        mediaId = grant.mediaId
      }
      setStage("attaching")
      setProgress(94)
      const saved = await addContentUnit(content.id, {
        title: title.trim(),
        slug,
        position,
        mediaId,
      })
      onSaved(saved)
      setStage("done")
      setProgress(100)
      setFile(null)
      setManifestPath("")
      setEncodingVersion("")
      setChecksumSha256("")
      setEnglishCaptionPath("")
      setArabicCaptionPath("")
      setTitle("")
      setSlug("")
      setSlugEdited(false)
      toast.add({
        title: t("videoAttached"),
        description: t("videoAttachedDescription"),
        type: "success",
      })
    } catch (caught) {
      setStage("idle")
      setProgress(0)
      setError(caught instanceof Error ? caught.message : t("uploadFailed"))
    }
  }

  const stageLabel =
    stage === "uploading"
      ? t("uploadingVideo")
      : stage === "ingesting"
        ? t("submittingVideo")
        : stage === "registering"
          ? t("validatingHls")
          : stage === "attaching"
            ? t("attachingLesson")
            : t("videoAttached")

  return (
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{t("mediaTitle")}</DialogTitle>
        <DialogDescription>{t("mediaDescription")}</DialogDescription>
      </DialogHeader>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">{t("currentLessons")}</h3>
        {content.units.length ? (
          <Accordion className="border px-3">
            {content.units.map((unit) => (
              <AccordionItem key={unit.id} value={unit.id}>
                <AccordionTrigger className="items-center py-3 no-underline hover:no-underline">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center bg-primary/10 text-sm font-semibold text-primary tabular-nums">
                      {unit.position}
                    </span>
                    <span className="truncate text-sm font-medium">
                      {localize(unit.title, locale)}
                    </span>
                    <Badge
                      variant={
                        unit.media.status === "READY" ? "default" : "secondary"
                      }
                    >
                      {unit.media.status}
                    </Badge>
                    <Badge variant="outline">
                      {(unit.attachments ?? []).length} {t("attachments")}
                    </Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <AttachmentManager
                    unit={unit}
                    onChange={(attachments) =>
                      onSaved({
                        ...content,
                        units: content.units.map((candidate) =>
                          candidate.id === unit.id
                            ? { ...candidate, attachments }
                            : candidate
                        ),
                      })
                    }
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noLessons")}</p>
        )}
      </section>

      <Separator />

      {courseHasVideo ? (
        <Alert>
          <FilmStripIcon aria-hidden="true" />
          <AlertTitle>{t("oneCourseVideo")}</AlertTitle>
        </Alert>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-5">
          <FieldGroup>
            <Field>
              <FieldLabel id="media-source-label">
                {t("mediaSource")}
              </FieldLabel>
              <ToggleGroup
                aria-labelledby="media-source-label"
                value={[sourceKind]}
                onValueChange={(next) =>
                  setSourceKind((next[0] ?? sourceKind) as MediaSourceKind)
                }
                variant="selection"
                disabled={busy}
              >
                <ToggleGroupItem type="button" value="STATIC_HLS">
                  {t("staticHlsPackage")}
                </ToggleGroupItem>
                <ToggleGroupItem type="button" value="MUX">
                  {t("muxUpload")}
                </ToggleGroupItem>
              </ToggleGroup>
            </Field>
            {sourceKind === "MUX" ? (
              <Field>
                <FieldLabel htmlFor="lesson-video">{t("videoFile")}</FieldLabel>
                <Input
                  id="lesson-video"
                  type="file"
                  accept="video/*"
                  disabled={busy}
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </Field>
            ) : (
              <div className="flex flex-col gap-4 border bg-muted/30 p-4">
                <Field>
                  <FieldLabel htmlFor="hls-manifest-path">
                    {t("manifestPath")}
                  </FieldLabel>
                  <Input
                    id="hls-manifest-path"
                    dir="ltr"
                    placeholder="pilots/course/v1/master.m3u8"
                    value={manifestPath}
                    disabled={busy}
                    onChange={(event) => setManifestPath(event.target.value)}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="hls-duration">
                      {t("durationSeconds")}
                    </FieldLabel>
                    <Input
                      id="hls-duration"
                      type="number"
                      min={1}
                      value={durationSeconds}
                      disabled={busy}
                      onChange={(event) =>
                        setDurationSeconds(Number(event.target.value))
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="hls-encoding-version">
                      {t("encodingVersion")}
                    </FieldLabel>
                    <Input
                      id="hls-encoding-version"
                      dir="ltr"
                      placeholder="2026-08-17-v3"
                      value={encodingVersion}
                      disabled={busy}
                      onChange={(event) =>
                        setEncodingVersion(event.target.value)
                      }
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="hls-checksum">
                    {t("packageChecksum")}
                  </FieldLabel>
                  <Input
                    id="hls-checksum"
                    dir="ltr"
                    placeholder={t("optional")}
                    value={checksumSha256}
                    disabled={busy}
                    onChange={(event) => setChecksumSha256(event.target.value)}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="hls-captions-en">
                      {t("englishCaptions")}
                    </FieldLabel>
                    <Input
                      id="hls-captions-en"
                      dir="ltr"
                      placeholder={t("optionalVttPath")}
                      value={englishCaptionPath}
                      disabled={busy}
                      onChange={(event) =>
                        setEnglishCaptionPath(event.target.value)
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="hls-captions-ar">
                      {t("arabicCaptions")}
                    </FieldLabel>
                    <Input
                      id="hls-captions-ar"
                      dir="ltr"
                      placeholder={t("optionalVttPath")}
                      value={arabicCaptionPath}
                      disabled={busy}
                      onChange={(event) =>
                        setArabicCaptionPath(event.target.value)
                      }
                    />
                  </Field>
                </div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
              <Field>
                <FieldLabel htmlFor="lesson-title">
                  {t("lessonTitle")}
                </FieldLabel>
                <Input
                  id="lesson-title"
                  value={title}
                  disabled={busy}
                  onChange={(event) => {
                    setTitle(event.target.value)
                    if (!slugEdited) {
                      setSlug(
                        event.target.value
                          .toLowerCase()
                          .trim()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-|-$/g, "")
                      )
                    }
                  }}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="lesson-position">
                  {t("lessonPosition")}
                </FieldLabel>
                <Input
                  id="lesson-position"
                  type="number"
                  min={1}
                  value={position}
                  disabled={busy}
                  onChange={(event) => setPosition(Number(event.target.value))}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="lesson-slug">{t("slug")}</FieldLabel>
              <Input
                id="lesson-slug"
                dir="ltr"
                value={slug}
                disabled={busy}
                onChange={(event) => {
                  setSlugEdited(true)
                  setSlug(event.target.value.toLowerCase().replace(/\s+/g, "-"))
                }}
              />
            </Field>
          </FieldGroup>

          {error && (
            <Alert variant="destructive">
              <CloudArrowUpIcon aria-hidden="true" />
              <AlertTitle>{t("uploadFailed")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {stage !== "idle" && (
            <Progress value={progress} aria-label={stageLabel}>
              <div className="flex w-full items-center gap-2 text-sm">
                {busy && (
                  <SpinnerGapIcon className="animate-spin" aria-hidden="true" />
                )}
                <span>{stageLabel}</span>
                <span className="ms-auto text-muted-foreground tabular-nums">
                  {progress}%
                </span>
              </div>
            </Progress>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              {t("cancel")}
            </DialogClose>
            <Button type="submit" disabled={busy}>
              <UploadSimpleIcon data-icon="inline-start" />
              {sourceKind === "STATIC_HLS"
                ? t("registerAndAttach")
                : t("uploadAndAttach")}
            </Button>
          </DialogFooter>
        </form>
      )}
    </DialogContent>
  )
}

function visibilityLabel(
  visibility: ContentVisibility,
  t: ReturnType<typeof useLocale>["t"]
) {
  if (visibility === "AUTHENTICATED") return t("authenticated")
  if (visibility === "STUDENT_ONLY") return t("studentOnly")
  return t("public")
}

type EditorValues = {
  title: string
  slug: string
  summary: string
  kind: "COURSE" | "SERIES"
  visibility: ContentVisibility
}

function ContentEditor({
  content,
  onSaved,
}: {
  content: LearningContent | null
  onSaved: (saved: LearningContent) => void
}) {
  const { t } = useLocale()
  const [values, setValues] = React.useState<EditorValues>(() =>
    editorValues(content)
  )
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof EditorValues, string>>
  >({})
  const [saving, startSaving] = React.useTransition()

  React.useEffect(() => {
    setValues(editorValues(content))
    setErrors({})
  }, [content])

  const setValue = <TKey extends keyof EditorValues>(
    key: TKey,
    value: EditorValues[TKey]
  ) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors: typeof errors = {}
    if (!values.title.trim()) nextErrors.title = t("requiredField")
    if (!values.summary.trim()) nextErrors.summary = t("requiredField")
    if (!values.slug.trim()) nextErrors.slug = t("requiredField")
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug))
      nextErrors.slug = t("invalidSlug")
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    startSaving(async () => {
      try {
        const saved = content
          ? await updateDraft(content.id, values)
          : await createDraft(values)
        onSaved(saved)
        toast.add({
          title: content ? t("draftUpdated") : t("draftCreated"),
          description: t("draftSavedDescription"),
          type: "success",
        })
      } catch {
        toast.add({
          title: t("saveFailed"),
          description: "Please retry or check the API connection.",
          type: "error",
        })
      }
    })
  }

  return (
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>{content ? t("edit") : t("createTitle")}</DialogTitle>
        <DialogDescription>{t("createDescription")}</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <FieldGroup>
          <Field data-invalid={Boolean(errors.title)}>
            <FieldLabel htmlFor="content-title">{t("title")}</FieldLabel>
            <Input
              id="content-title"
              value={values.title}
              onChange={(event) => setValue("title", event.target.value)}
              aria-invalid={Boolean(errors.title)}
            />
            <FieldError>{errors.title}</FieldError>
          </Field>
          <Field data-invalid={Boolean(errors.slug)}>
            <FieldLabel htmlFor="content-slug">{t("slug")}</FieldLabel>
            <Input
              id="content-slug"
              dir="ltr"
              value={values.slug}
              onChange={(event) =>
                setValue(
                  "slug",
                  event.target.value.toLowerCase().replace(/\s+/g, "-")
                )
              }
              aria-invalid={Boolean(errors.slug)}
            />
            <FieldError>{errors.slug}</FieldError>
          </Field>
          <Field data-invalid={Boolean(errors.summary)}>
            <FieldLabel htmlFor="content-summary">{t("summary")}</FieldLabel>
            <Textarea
              id="content-summary"
              rows={4}
              value={values.summary}
              onChange={(event) => setValue("summary", event.target.value)}
              aria-invalid={Boolean(errors.summary)}
            />
            <FieldError>{errors.summary}</FieldError>
          </Field>
          <Field>
            <FieldLabel id="content-kind-label">{t("kind")}</FieldLabel>
            <ToggleGroup
              aria-labelledby="content-kind-label"
              value={[values.kind]}
              onValueChange={(next) =>
                setValue(
                  "kind",
                  (next[0] ?? values.kind) as EditorValues["kind"]
                )
              }
              variant="selection"
            >
              <ToggleGroupItem type="button" value="COURSE">
                {t("course")}
              </ToggleGroupItem>
              <ToggleGroupItem type="button" value="SERIES">
                {t("series")}
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>
          <Field>
            <FieldLabel id="content-visibility-label">
              {t("visibility")}
            </FieldLabel>
            <ToggleGroup
              className="flex-wrap"
              aria-labelledby="content-visibility-label"
              value={[values.visibility]}
              onValueChange={(next) =>
                setValue(
                  "visibility",
                  (next[0] ?? values.visibility) as ContentVisibility
                )
              }
              variant="selection"
            >
              <ToggleGroupItem type="button" value="PUBLIC">
                {t("public")}
              </ToggleGroupItem>
              <ToggleGroupItem type="button" value="AUTHENTICATED">
                {t("authenticated")}
              </ToggleGroupItem>
              <ToggleGroupItem type="button" value="STUDENT_ONLY">
                {t("studentOnly")}
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>
        </FieldGroup>
        <Separator />
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            {t("cancel")}
          </DialogClose>
          <Button type="submit" disabled={saving}>
            {saving ? t("loading") : t("saveDraft")}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

function editorValues(content: LearningContent | null): EditorValues {
  return {
    title: content?.title.en ?? "",
    slug: content?.slug ?? "",
    summary: content?.summary.en ?? "",
    kind: content?.kind ?? "COURSE",
    visibility: content?.visibility ?? "PUBLIC",
  }
}
