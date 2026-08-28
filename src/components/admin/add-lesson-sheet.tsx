import * as React from "react"
import { FileArrowUpIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  addContentUnit,
  getAdminContentById,
  registerStaticHls,
} from "@/lib/api"
import { useLocale } from "@/lib/locale-context"
import { toast } from "@/components/ui/toast"
import { CaptionTrackEditor } from "./caption-track-editor"
import type { CaptionDraft } from "./caption-track-editor"
import type { LearningContent } from "@/types/content"

type FormValues = {
  slug: string
  position: string
  title: string
  titleAr: string
  summary: string
  summaryAr: string
  manifestPath: string
  encodingVersion: string
  checksumSha256: string
  sectionId: string
}

type FormErrors = Partial<Record<keyof FormValues | "form", string>>

function nextPosition(content: LearningContent) {
  return String(
    content.units.reduce(
      (highest, unit) => Math.max(highest, unit.position),
      0
    ) + 1
  )
}

function initialValues(content: LearningContent): FormValues {
  return {
    slug: "",
    position: nextPosition(content),
    title: "",
    titleAr: "",
    summary: "",
    summaryAr: "",
    manifestPath: "",
    encodingVersion: "",
    checksumSha256: "",
    sectionId: "",
  }
}

function validate(values: FormValues, required: string) {
  const errors: FormErrors = {}
  if (!values.title.trim()) errors.title = required
  if (!values.slug.trim()) errors.slug = required
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug.trim())) {
    errors.slug = "invalidSlug"
  }
  const position = Number(values.position)
  if (!Number.isInteger(position) || position <= 0)
    errors.position = "invalidPosition"
  if (!values.manifestPath.trim()) errors.manifestPath = required
  if (!values.encodingVersion.trim()) errors.encodingVersion = required
  if (
    values.checksumSha256.trim() &&
    !/^[a-f\d]{64}$/i.test(values.checksumSha256.trim())
  ) {
    errors.checksumSha256 = "invalidChecksum"
  }
  return errors
}

function focusFirstError(errors: FormErrors) {
  const order: Array<keyof FormValues> = [
    "title",
    "slug",
    "position",
    "manifestPath",
    "encodingVersion",
    "checksumSha256",
    "sectionId",
  ]
  const key = order.find((field) => errors[field])
  if (key) document.getElementById(`add-lesson-${key}`)?.focus()
}

export function AddLessonSheet({
  content,
  open,
  onOpenChange,
  onSaved,
  onCaptionUpload,
}: {
  content: LearningContent
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (content: LearningContent) => void
  onCaptionUpload?: (file: File) => Promise<string>
}) {
  const { locale, t } = useLocale()
  const isSeries = content.kind === "SERIES"
  const [values, setValues] = React.useState(() => initialValues(content))
  const [errors, setErrors] = React.useState<FormErrors>({})
  const [busy, setBusy] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [captions, setCaptions] = React.useState<CaptionDraft[]>([])

  React.useEffect(() => {
    if (open) {
      setValues(initialValues(content))
      setErrors({})
      setProgress(0)
      setCaptions([])
    }
  }, [content, open])

  const update = <TKey extends keyof FormValues>(
    key: TKey,
    value: FormValues[TKey]
  ) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const validation = validate(values, t("requiredField"))
    if (
      captions.some(
        (caption) =>
          !caption.language.trim() ||
          !caption.label.trim() ||
          !caption.path.trim()
      )
    ) {
      validation.form = t("completeCaptionFields")
    }
    const localizedErrors: FormErrors = Object.fromEntries(
      Object.entries(validation).map(([key, value]) => [
        key,
        value === "invalidSlug"
          ? t("invalidSlug")
          : value === "invalidPosition"
            ? t("invalidPosition")
            : value === "invalidChecksum"
              ? t("invalidChecksum")
              : value,
      ])
    )
    setErrors(localizedErrors)
    if (Object.keys(localizedErrors).length) {
      focusFirstError(localizedErrors)
      return
    }

    setBusy(true)
    setProgress(10)
    try {
      const registered = await registerStaticHls({
        manifestPath: values.manifestPath.trim(),
        encodingVersion: values.encodingVersion.trim(),
        checksumSha256: values.checksumSha256.trim() || undefined,
        captions: captions.map((caption) => ({
          language: caption.language.trim(),
          label: caption.label.trim(),
          path: caption.path.trim(),
          defaultTrack: caption.defaultTrack,
        })),
      })
      setProgress(60)
      await addContentUnit(content.id, {
        slug: values.slug.trim(),
        position: Number(values.position),
        title: values.title.trim(),
        titleAr: values.titleAr.trim() || undefined,
        summary: values.summary.trim() || undefined,
        summaryAr: values.summaryAr.trim() || undefined,
        mediaId: registered.mediaId,
        sectionId: isSeries ? values.sectionId || undefined : undefined,
      })
      setProgress(85)
      const saved = await getAdminContentById(content.id)
      if (!saved) throw new Error("Content not found after lesson creation")
      setProgress(100)
      onSaved(saved)
      toast.add({ title: t("lessonAdded"), type: "success" })
      onOpenChange(false)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : t("saveFailed")
      setErrors({ form: message })
      toast.add({
        title: t("lessonAddFailed"),
        description: message,
        type: "error",
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("addLesson")}</DialogTitle>
          <DialogDescription>{t("addLessonDescription")}</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.title)}>
              <FieldLabel htmlFor="add-lesson-title">
                {t("lessonTitle")}
              </FieldLabel>
              <Input
                id="add-lesson-title"
                value={values.title}
                onChange={(event) => update("title", event.target.value)}
                aria-invalid={Boolean(errors.title)}
              />
              <FieldError>{errors.title}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.titleAr)}>
              <FieldLabel htmlFor="add-lesson-titleAr">
                {t("titleArabic")}
              </FieldLabel>
              <Input
                id="add-lesson-titleAr"
                dir="rtl"
                value={values.titleAr}
                onChange={(event) => update("titleAr", event.target.value)}
                aria-invalid={Boolean(errors.titleAr)}
              />
              <FieldError>{errors.titleAr}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.slug)}>
              <FieldLabel htmlFor="add-lesson-slug">
                {t("lessonSlug")}
              </FieldLabel>
              <Input
                id="add-lesson-slug"
                value={values.slug}
                onChange={(event) => update("slug", event.target.value)}
                aria-invalid={Boolean(errors.slug)}
              />
              <FieldDescription>{t("slug")}</FieldDescription>
              <FieldError>{errors.slug}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.position)}>
              <FieldLabel htmlFor="add-lesson-position">
                {t("lessonPosition")}
              </FieldLabel>
              <Input
                id="add-lesson-position"
                type="number"
                min={1}
                step={1}
                value={values.position}
                onChange={(event) => update("position", event.target.value)}
                aria-invalid={Boolean(errors.position)}
              />
              <FieldError>{errors.position}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="add-lesson-summary">
                {t("lessonSummary")}
              </FieldLabel>
              <Textarea
                id="add-lesson-summary"
                value={values.summary}
                onChange={(event) => update("summary", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="add-lesson-summaryAr">
                {t("summaryArabic")}
              </FieldLabel>
              <Textarea
                id="add-lesson-summaryAr"
                dir="rtl"
                value={values.summaryAr}
                onChange={(event) => update("summaryAr", event.target.value)}
              />
            </Field>
            {isSeries && (
              <Field data-invalid={Boolean(errors.sectionId)}>
                <FieldLabel htmlFor="add-lesson-sectionId">
                  {t("destinationSection")}
                </FieldLabel>
                <Select
                  value={values.sectionId || "unsectioned"}
                  onValueChange={(value) =>
                    update(
                      "sectionId",
                      value === "unsectioned" || !value ? "" : value
                    )
                  }
                >
                  <SelectTrigger
                    id="add-lesson-sectionId"
                    className="w-full"
                    aria-invalid={Boolean(errors.sectionId)}
                  >
                    <SelectValue placeholder={t("chooseSection")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unsectioned">
                      {t("unsectioned")}
                    </SelectItem>
                    {content.sections
                      .slice()
                      .sort((left, right) => left.position - right.position)
                      .map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.position}.{" "}
                          {section.title[locale] || section.title.en}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FieldError>{errors.sectionId}</FieldError>
              </Field>
            )}
          </FieldGroup>

          <Separator />
          <div className="flex flex-col gap-1">
            <h3 className="font-medium">{t("staticHlsPackage")}</h3>
            <p className="text-xs text-muted-foreground">
              {t("onlyStaticHlsDescription")}
            </p>
          </div>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.manifestPath)}>
              <FieldLabel htmlFor="add-lesson-manifestPath">
                {t("manifestPath")}
              </FieldLabel>
              <Input
                id="add-lesson-manifestPath"
                value={values.manifestPath}
                onChange={(event) => update("manifestPath", event.target.value)}
                aria-invalid={Boolean(errors.manifestPath)}
              />
              <FieldDescription>{t("technicalPath")}</FieldDescription>
              <FieldError>{errors.manifestPath}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.encodingVersion)}>
              <FieldLabel htmlFor="add-lesson-encodingVersion">
                {t("encodingVersion")}
              </FieldLabel>
              <Input
                id="add-lesson-encodingVersion"
                value={values.encodingVersion}
                onChange={(event) =>
                  update("encodingVersion", event.target.value)
                }
                aria-invalid={Boolean(errors.encodingVersion)}
              />
              <FieldError>{errors.encodingVersion}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.checksumSha256)}>
              <FieldLabel htmlFor="add-lesson-checksumSha256">
                {t("packageChecksum")} ({t("optional")})
              </FieldLabel>
              <Input
                id="add-lesson-checksumSha256"
                value={values.checksumSha256}
                onChange={(event) =>
                  update("checksumSha256", event.target.value)
                }
                aria-invalid={Boolean(errors.checksumSha256)}
              />
              <FieldError>{errors.checksumSha256}</FieldError>
            </Field>
          </FieldGroup>
          <CaptionTrackEditor
            value={captions}
            onChange={setCaptions}
            disabled={busy}
            onUpload={onCaptionUpload}
          />
          <FieldError>{errors.form}</FieldError>
          {busy && (
            <Progress value={progress} aria-label={t("uploadProgress")}>
              <ProgressLabel>{t("uploadProgress")}</ProgressLabel>
              <ProgressValue />
            </Progress>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={busy}>
              <FileArrowUpIcon data-icon="inline-start" aria-hidden="true" />
              {busy ? t("loading") : t("addLesson")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
