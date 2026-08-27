import * as React from "react"
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  BookOpenIcon,
  FolderOpenIcon,
  NotePencilIcon,
  PlusIcon,
  SpinnerGapIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import { Link, useBlocker, useRouter } from "@tanstack/react-router"

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
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { replaceCurriculum } from "@/lib/api"
import { useLocale } from "@/lib/locale-context"
import { localize } from "@/types/content"
import type { LearningContent } from "@/types/content"

const UNSECTIONED = "__unsectioned"

interface EditableSection {
  key: string
  id?: string
  title: string
  titleAr: string
  description: string
  descriptionAr: string
  unitIds: string[]
}

export function CurriculumEditor({
  initial,
  embedded = false,
  onSaved,
}: {
  initial: LearningContent
  embedded?: boolean
  onSaved?: (content: LearningContent) => void
}) {
  const { locale, t } = useLocale()
  const router = useRouter()
  const [content, setContent] = React.useState(initial)
  const initialDraft = React.useMemo(() => toDraft(initial), [initial])
  const [sections, setSections] = React.useState<EditableSection[]>(
    initialDraft.sections
  )
  const [unsectioned, setUnsectioned] = React.useState(initialDraft.unsectioned)
  const [baseline, setBaseline] = React.useState(() =>
    serialize(initialDraft.sections, initialDraft.unsectioned)
  )
  const [editingKey, setEditingKey] = React.useState<string | "new" | null>(
    null
  )
  const [deletingKey, setDeletingKey] = React.useState<string | null>(null)
  const [saving, startSaving] = React.useTransition()
  const currentSnapshot = serialize(sections, unsectioned)
  const dirty = currentSnapshot !== baseline
  const statusLabel =
    content.status === "PUBLISHED"
      ? t("published")
      : content.status === "DRAFT"
        ? t("drafts")
        : t("archived")
  const hasBlankTitle = sections.some((section) => !section.title.trim())
  const publishedIncomplete =
    content.status === "PUBLISHED" &&
    sections.length > 0 &&
    (unsectioned.length > 0 ||
      sections.some((section) => section.unitIds.length === 0))
  const blocker = useBlocker({
    shouldBlockFn: () => dirty && !saving,
    enableBeforeUnload: dirty,
    withResolver: true,
  })

  const reset = (saved = content) => {
    const next = toDraft(saved)
    setSections(next.sections)
    setUnsectioned(next.unsectioned)
    setBaseline(serialize(next.sections, next.unsectioned))
  }

  const save = () => {
    if (!dirty || hasBlankTitle || publishedIncomplete) return
    startSaving(async () => {
      try {
        const saved = await replaceCurriculum(content.id, {
          sections: sections.map((section) => ({
            id: section.id,
            title: section.title.trim(),
            titleAr: clean(section.titleAr),
            description: clean(section.description),
            descriptionAr: clean(section.descriptionAr),
            unitIds: section.unitIds,
          })),
          unsectionedUnitIds: unsectioned,
        })
        setContent(saved)
        reset(saved)
        onSaved?.(saved)
        // Refresh the cached admin loader so Dashboard, Content library, and
        // Media inbox reflect the curriculum change after navigating back.
        await router.invalidate({ sync: true }).catch(() => undefined)
        toast.add({ title: t("curriculumSaved"), type: "success" })
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

  const moveSection = (index: number, offset: number) => {
    setSections((current) => moveItem(current, index, index + offset))
  }

  const moveLesson = (unitId: string, destination: string) => {
    setSections((current) =>
      current.map((section) => ({
        ...section,
        unitIds: section.unitIds.filter((id) => id !== unitId),
      }))
    )
    setUnsectioned((current) => current.filter((id) => id !== unitId))
    if (destination === UNSECTIONED) {
      setUnsectioned((current) => [...current, unitId])
    } else {
      setSections((current) =>
        current.map((section) =>
          section.key === destination
            ? { ...section, unitIds: [...section.unitIds, unitId] }
            : section
        )
      )
    }
  }

  const moveLessonWithin = (
    collection: string[],
    unitIndex: number,
    offset: number,
    sectionKey?: string
  ) => {
    const moved = moveItem(collection, unitIndex, unitIndex + offset)
    if (sectionKey) {
      setSections((current) =>
        current.map((section) =>
          section.key === sectionKey ? { ...section, unitIds: moved } : section
        )
      )
    } else setUnsectioned(moved)
  }

  const deleteSection = () => {
    const target = sections.find((section) => section.key === deletingKey)
    if (!target) return
    setUnsectioned((current) => [...current, ...target.unitIds])
    setSections((current) =>
      current.filter((section) => section.key !== target.key)
    )
    setDeletingKey(null)
  }

  const destinations = [
    { value: UNSECTIONED, label: t("unsectioned") },
    ...sections.map((section) => ({
      value: section.key,
      label: section.title || t("section"),
    })),
  ]
  const actions = (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        disabled={!dirty || saving}
        onClick={() => reset()}
      >
        {t("discardChanges")}
      </Button>
      <Button
        disabled={!dirty || saving || hasBlankTitle || publishedIncomplete}
        onClick={save}
      >
        {saving && (
          <SpinnerGapIcon data-icon="inline-start" className="animate-spin" />
        )}
        {t("saveCurriculum")}
      </Button>
    </div>
  )

  return (
    <div
      className={
        embedded ? "flex flex-col gap-6" : "content-shell py-8 sm:py-12"
      }
    >
      {!embedded && (
        <header className="flex flex-col gap-5 border-b pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex max-w-3xl flex-col gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-fit"
              render={
                <Link
                  to="/$locale/admin"
                  params={{ locale }}
                  search={{ section: "content" }}
                />
              }
              nativeButton={false}
            >
              <ArrowLeftIcon
                data-icon="inline-start"
                className="rtl:rotate-180"
              />
              {t("contentLibrary")}
            </Button>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{t("series")}</Badge>
                <Badge variant="secondary">{statusLabel}</Badge>
                {dirty && <Badge>{t("unsavedChanges")}</Badge>}
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {t("curriculumEditorTitle")}
              </h1>
              <p className="text-muted-foreground">
                {localize(content.title, locale)} ·{" "}
                {t("curriculumEditorDescription")}
              </p>
            </div>
          </div>
          {actions}
        </header>
      )}

      {embedded && (
        <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">
              {t("curriculumEditorTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("curriculumEditorDescription")}
            </p>
          </div>
          {actions}
        </div>
      )}

      <main
        className={
          embedded ? "flex flex-col gap-6" : "mt-8 flex flex-col gap-6"
        }
      >
        {publishedIncomplete && (
          <Alert variant="destructive">
            <FolderOpenIcon aria-hidden="true" />
            <AlertTitle>{t("unsavedChanges")}</AlertTitle>
            <AlertDescription>
              {t("unsectionedDescription")} {t("emptySection")}
            </AlertDescription>
          </Alert>
        )}

        {!sections.length && (
          <Card>
            <CardContent>
              <Empty className="py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <BookOpenIcon />
                  </EmptyMedia>
                  <EmptyTitle>{t("flatCurriculum")}</EmptyTitle>
                  <EmptyDescription>
                    {t("flatCurriculumDescription")}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </CardContent>
          </Card>
        )}

        {sections.map((section, sectionIndex) => (
          <Card key={section.key}>
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center bg-primary/10 font-semibold text-primary tabular-nums">
                  {sectionIndex + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <CardTitle>{localizeDraft(section, locale)}</CardTitle>
                  <CardDescription>
                    {section.description || section.descriptionAr
                      ? locale === "ar"
                        ? section.descriptionAr || section.description
                        : section.description || section.descriptionAr
                      : `${section.unitIds.length} ${t("lessons")}`}
                  </CardDescription>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={sectionIndex === 0}
                  title={t("moveUp")}
                  onClick={() => moveSection(sectionIndex, -1)}
                >
                  <ArrowUpIcon />
                  <span className="sr-only">{t("moveUp")}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={sectionIndex === sections.length - 1}
                  title={t("moveDown")}
                  onClick={() => moveSection(sectionIndex, 1)}
                >
                  <ArrowDownIcon />
                  <span className="sr-only">{t("moveDown")}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title={t("editSection")}
                  onClick={() => setEditingKey(section.key)}
                >
                  <NotePencilIcon />
                  <span className="sr-only">{t("editSection")}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title={t("deleteSection")}
                  onClick={() => setDeletingKey(section.key)}
                >
                  <TrashIcon />
                  <span className="sr-only">{t("deleteSection")}</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {section.unitIds.length ? (
                section.unitIds.map((unitId, unitIndex) => (
                  <LessonOrganizerRow
                    key={unitId}
                    content={content}
                    unitId={unitId}
                    number={`${sectionIndex + 1}.${unitIndex + 1}`}
                    collection={section.unitIds}
                    index={unitIndex}
                    destination={section.key}
                    destinations={destinations}
                    onMoveDestination={moveLesson}
                    onMove={(offset) =>
                      moveLessonWithin(
                        section.unitIds,
                        unitIndex,
                        offset,
                        section.key
                      )
                    }
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("emptySection")}
                </p>
              )}
            </CardContent>
            {unsectioned.length > 0 && (
              <CardFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSections((current) =>
                      current.map((candidate) =>
                        candidate.key === section.key
                          ? {
                              ...candidate,
                              unitIds: [...candidate.unitIds, ...unsectioned],
                            }
                          : candidate
                      )
                    )
                    setUnsectioned([])
                  }}
                >
                  <FolderOpenIcon data-icon="inline-start" />
                  {t("moveAllHere")}
                </Button>
              </CardFooter>
            )}
          </Card>
        ))}

        <Button
          variant="outline"
          className="w-fit"
          onClick={() => setEditingKey("new")}
        >
          <PlusIcon data-icon="inline-start" />
          {t("addSection")}
        </Button>

        {unsectioned.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("unsectioned")}</CardTitle>
              <CardDescription>{t("unsectionedDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {unsectioned.map((unitId, unitIndex) => (
                <LessonOrganizerRow
                  key={unitId}
                  content={content}
                  unitId={unitId}
                  number={String(unitIndex + 1)}
                  collection={unsectioned}
                  index={unitIndex}
                  destination={UNSECTIONED}
                  destinations={destinations}
                  onMoveDestination={moveLesson}
                  onMove={(offset) =>
                    moveLessonWithin(unsectioned, unitIndex, offset)
                  }
                />
              ))}
            </CardContent>
          </Card>
        )}
      </main>

      <SectionEditorDialog
        section={
          editingKey && editingKey !== "new"
            ? sections.find((section) => section.key === editingKey)
            : undefined
        }
        open={editingKey !== null}
        onOpenChange={(open) => {
          if (!open) setEditingKey(null)
        }}
        onSave={(draft) => {
          if (editingKey === "new") {
            setSections((current) => [
              ...current,
              {
                ...draft,
                key: `new-${crypto.randomUUID()}`,
                unitIds: [],
              },
            ])
          } else {
            setSections((current) =>
              current.map((section) =>
                section.key === editingKey ? { ...section, ...draft } : section
              )
            )
          }
          setEditingKey(null)
        }}
      />

      <AlertDialog
        open={deletingKey !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingKey(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteSectionTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteSectionDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={deleteSection}>
              {t("deleteSection")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={blocker.status === "blocked"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("unsavedChanges")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("curriculumEditorDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>
              {t("keepEditing")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => blocker.proceed?.()}
            >
              {t("leaveWithoutSaving")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function LessonOrganizerRow({
  content,
  unitId,
  number,
  collection,
  index,
  destination,
  destinations,
  onMoveDestination,
  onMove,
}: {
  content: LearningContent
  unitId: string
  number: string
  collection: string[]
  index: number
  destination: string
  destinations: { value: string; label: string }[]
  onMoveDestination: (unitId: string, destination: string) => void
  onMove: (offset: number) => void
}) {
  const { locale, t } = useLocale()
  const unit = content.units.find((candidate) => candidate.id === unitId)
  if (!unit) return null
  return (
    <div className="flex flex-col gap-3 border bg-muted/30 p-3 sm:flex-row sm:items-center">
      <span className="flex size-8 shrink-0 items-center justify-center bg-background text-xs font-semibold tabular-nums">
        {number}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {localize(unit.title, locale)}
      </span>
      <Field orientation="horizontal" className="w-full gap-2 sm:w-auto">
        <FieldLabel className="sr-only">{t("destinationSection")}</FieldLabel>
        <Select
          items={destinations}
          value={destination}
          onValueChange={(next) => next && onMoveDestination(unitId, next)}
        >
          <SelectTrigger
            className="w-full sm:w-44"
            aria-label={t("destinationSection")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {destinations.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={index === 0}
          title={t("moveUp")}
          onClick={() => onMove(-1)}
        >
          <ArrowUpIcon />
          <span className="sr-only">{t("moveUp")}</span>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={index === collection.length - 1}
          title={t("moveDown")}
          onClick={() => onMove(1)}
        >
          <ArrowDownIcon />
          <span className="sr-only">{t("moveDown")}</span>
        </Button>
      </div>
    </div>
  )
}

function SectionEditorDialog({
  section,
  open,
  onOpenChange,
  onSave,
}: {
  section?: EditableSection
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (
    section: Pick<
      EditableSection,
      "title" | "titleAr" | "description" | "descriptionAr"
    >
  ) => void
}) {
  const { t } = useLocale()
  const [title, setTitle] = React.useState("")
  const [titleAr, setTitleAr] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [descriptionAr, setDescriptionAr] = React.useState("")

  React.useEffect(() => {
    if (!open) return
    setTitle(section?.title ?? "")
    setTitleAr(section?.titleAr ?? "")
    setDescription(section?.description ?? "")
    setDescriptionAr(section?.descriptionAr ?? "")
  }, [open, section])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {section ? t("editSection") : t("addSection")}
          </DialogTitle>
          <DialogDescription>
            {t("curriculumEditorDescription")}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="section-title-en">
              {t("sectionTitleEnglish")}
            </FieldLabel>
            <Input
              id="section-title-en"
              value={title}
              maxLength={240}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="section-title-ar">
              {t("sectionTitleArabic")}
            </FieldLabel>
            <Input
              id="section-title-ar"
              dir="rtl"
              value={titleAr}
              maxLength={240}
              onChange={(event) => setTitleAr(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="section-description-en">
              {t("sectionDescriptionEnglish")}
            </FieldLabel>
            <Textarea
              id="section-description-en"
              value={description}
              maxLength={600}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="section-description-ar">
              {t("sectionDescriptionArabic")}
            </FieldLabel>
            <Textarea
              id="section-description-ar"
              dir="rtl"
              value={descriptionAr}
              maxLength={600}
              onChange={(event) => setDescriptionAr(event.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            disabled={!title.trim()}
            onClick={() =>
              onSave({ title, titleAr, description, descriptionAr })
            }
          >
            {t("saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function toDraft(content: LearningContent) {
  const sectionedIds = new Set<string>()
  const sections = [...content.sections]
    .sort((left, right) => left.position - right.position)
    .map((section) => {
      const unitIds = content.units
        .filter((unit) => unit.sectionId === section.id)
        .sort((left, right) => left.position - right.position)
        .map((unit) => unit.id)
      unitIds.forEach((id) => sectionedIds.add(id))
      return {
        key: section.id,
        id: section.id,
        title: section.title.en,
        titleAr: section.title.ar ?? "",
        description: section.description?.en ?? "",
        descriptionAr: section.description?.ar ?? "",
        unitIds,
      }
    })
  const unsectioned = content.units
    .filter((unit) => !sectionedIds.has(unit.id))
    .sort((left, right) => left.position - right.position)
    .map((unit) => unit.id)
  return { sections, unsectioned }
}

function serialize(sections: EditableSection[], unsectioned: string[]) {
  return JSON.stringify({ sections, unsectioned })
}

function moveItem<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length || from === to) return items
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function clean(value: string) {
  return value.trim() || undefined
}

function localizeDraft(section: EditableSection, locale: "en" | "ar") {
  return locale === "ar" ? section.titleAr || section.title : section.title
}
