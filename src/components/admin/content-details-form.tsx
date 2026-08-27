import * as React from "react"
import { CheckIcon, ImageIcon, XIcon } from "@phosphor-icons/react"

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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  completeCoverUpload,
  deleteCover,
  getAdminContentById,
  requestCoverUpload,
  updateContentMetadata,
  uploadCoverImage,
} from "@/lib/api"
import { useLocale } from "@/lib/locale-context"
import { toast } from "@/components/ui/toast"
import { InstructorManager } from "./instructor-manager"
import type {
  ContentMetadataInput,
  LearningContent,
  ReferenceData,
  SpokenLanguage,
} from "@/types/content"

export function ContentDetailsForm({
  content,
  referenceData,
  onSaved,
  onReferenceDataChanged,
}: {
  content: LearningContent
  referenceData: ReferenceData
  onSaved: (content: LearningContent) => void
  onReferenceDataChanged: (referenceData: ReferenceData) => void
}) {
  const { locale, t } = useLocale()
  const [form, setForm] = React.useState<ContentMetadataInput>(() =>
    toForm(content)
  )
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof ContentMetadataInput, string>>
  >({})
  const [busy, setBusy] = React.useState(false)
  const [coverBusy, setCoverBusy] = React.useState(false)
  const [coverProgress, setCoverProgress] = React.useState(0)
  const coverInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => setForm(toForm(content)), [content])

  const update = <TKey extends keyof ContentMetadataInput>(
    key: TKey,
    value: ContentMetadataInput[TKey]
  ) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const validate = () => {
    const next: Partial<Record<keyof ContentMetadataInput, string>> = {}
    if (!form.title.trim()) next.title = t("requiredField")
    if (!form.summary.trim()) next.summary = t("requiredField")
    if (!form.description.trim()) next.description = t("requiredField")
    if (!form.slug.trim()) next.slug = t("requiredField")
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim()))
      next.slug = t("invalidSlug")
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    const valid = validate()
    if (!valid) {
      const invalidKeys = ["title", "summary", "description", "slug"] as const
      const first = ["title", "summary", "description", "slug"].find((key) => {
        const field = key as (typeof invalidKeys)[number]
        return (
          !form[field].trim() ||
          (field === "slug" &&
            !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim()))
        )
      })
      if (first) document.getElementById(`content-${first}`)?.focus()
      return
    }
    setBusy(true)
    try {
      const saved = await updateContentMetadata(content.id, {
        ...form,
        title: form.title.trim(),
        summary: form.summary.trim(),
        description: form.description.trim(),
        slug: form.slug.trim(),
        titleAr: form.titleAr?.trim() || undefined,
        summaryAr: form.summaryAr?.trim() || undefined,
        descriptionAr: form.descriptionAr?.trim() || undefined,
      })
      onSaved(saved)
      toast.add({ title: t("metadataSaved"), type: "success" })
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : t("saveFailed")
      setErrors({ form: message } as Partial<
        Record<keyof ContentMetadataInput, string>
      >)
      toast.add({ title: t("saveFailed"), description: message, type: "error" })
    } finally {
      setBusy(false)
    }
  }

  const uploadCover = async (file: File) => {
    if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) {
      toast.add({
        title: t("coverImage"),
        description: t("coverImageHint"),
        type: "error",
      })
      return
    }
    setCoverBusy(true)
    setCoverProgress(0)
    try {
      const grant = await requestCoverUpload(content.id, file)
      await uploadCoverImage(grant, file, setCoverProgress)
      await completeCoverUpload(content.id, grant.cover.id)
      const saved = await getAdminContentById(content.id)
      if (!saved) throw new Error("Content not found after cover upload")
      onSaved(saved)
      toast.add({ title: t("coverUploaded"), type: "success" })
    } catch (caught) {
      toast.add({
        title: t("saveFailed"),
        description: caught instanceof Error ? caught.message : t("saveFailed"),
        type: "error",
      })
    } finally {
      setCoverBusy(false)
    }
  }

  const removeCover = async () => {
    setCoverBusy(true)
    try {
      await deleteCover(content.id)
      const saved = await getAdminContentById(content.id)
      if (!saved) throw new Error("Content not found after cover deletion")
      onSaved(saved)
      toast.add({ title: t("coverRemoved"), type: "success" })
    } catch (caught) {
      toast.add({
        title: t("saveFailed"),
        description: caught instanceof Error ? caught.message : t("saveFailed"),
        type: "error",
      })
    } finally {
      setCoverBusy(false)
    }
  }

  const selectedTopics = referenceData.topics.filter((topic) =>
    form.topicSlugs.includes(topic.slug)
  )

  return (
    <form className="flex flex-col gap-6" onSubmit={save} noValidate>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{t("details")}</CardTitle>
            <Badge variant="outline">
              {content.kind === "COURSE" ? t("course") : t("series")}
            </Badge>
            <Badge variant="secondary">{t("kindImmutable")}</Badge>
          </div>
          <CardDescription>
            {t("bilingualTitle")}, {t("bilingualSummary")}, and{" "}
            {t("bilingualDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-5 lg:grid-cols-2">
            <LocalizedTextField
              id="content-title"
              label={t("title")}
              value={form.title}
              onChange={(value) => update("title", value)}
              error={errors.title}
            />
            <LocalizedTextField
              id="content-title-ar"
              label={t("titleArabic")}
              value={form.titleAr ?? ""}
              onChange={(value) => update("titleAr", value)}
              dir="rtl"
            />
            <LocalizedTextField
              id="content-summary"
              label={t("summary")}
              value={form.summary}
              onChange={(value) => update("summary", value)}
              error={errors.summary}
            />
            <LocalizedTextField
              id="content-summary-ar"
              label={t("summaryArabic")}
              value={form.summaryAr ?? ""}
              onChange={(value) => update("summaryAr", value)}
              dir="rtl"
            />
            <LocalizedTextField
              id="content-description"
              label={t("description")}
              value={form.description}
              onChange={(value) => update("description", value)}
              error={errors.description}
              multiline
            />
            <LocalizedTextField
              id="content-description-ar"
              label={t("descriptionArabic")}
              value={form.descriptionAr ?? ""}
              onChange={(value) => update("descriptionAr", value)}
              dir="rtl"
              multiline
            />
            <Field>
              <FieldLabel htmlFor="content-slug">{t("slug")}</FieldLabel>
              <Input
                id="content-slug"
                value={form.slug}
                onChange={(event) => update("slug", event.target.value)}
                aria-invalid={Boolean(errors.slug)}
              />
              <FieldDescription>{t("kindImmutable")}</FieldDescription>
              <FieldError>{errors.slug}</FieldError>
            </Field>
            <Field>
              <FieldLabel>{t("visibility")}</FieldLabel>
              <ToggleGroup
                value={[form.visibility]}
                onValueChange={(values) =>
                  values[0] &&
                  update(
                    "visibility",
                    values[0] as ContentMetadataInput["visibility"]
                  )
                }
                variant="outline"
                aria-label={t("visibility")}
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
            <Field>
              <FieldLabel>{t("spokenLanguage")}</FieldLabel>
              <ToggleGroup
                value={[form.spokenLanguage]}
                onValueChange={(values) =>
                  values[0] &&
                  update("spokenLanguage", values[0] as SpokenLanguage)
                }
                variant="outline"
                aria-label={t("spokenLanguage")}
              >
                <ToggleGroupItem type="button" value="EN">
                  {t("english")}
                </ToggleGroupItem>
                <ToggleGroupItem type="button" value="AR">
                  {t("arabic")}
                </ToggleGroupItem>
                <ToggleGroupItem type="button" value="MIXED">
                  {t("mixed")}
                </ToggleGroupItem>
              </ToggleGroup>
            </Field>
            <Field>
              <FieldLabel htmlFor="content-level">{t("level")}</FieldLabel>
              <Select
                value={form.levelSlug}
                onValueChange={(value) => value && update("levelSlug", value)}
              >
                <SelectTrigger id="content-level" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {referenceData.levels.map((level) => (
                    <SelectItem key={level.slug} value={level.slug}>
                      {localizeName(level.name, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>{t("topics")}</FieldLabel>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between"
                    />
                  }
                >
                  {selectedTopics.length
                    ? selectedTopics
                        .map((topic) => localizeName(topic.name, locale))
                        .join(", ")
                    : t("selectTopics")}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  {referenceData.topics.map((topic) => (
                    <DropdownMenuCheckboxItem
                      key={topic.slug}
                      checked={form.topicSlugs.includes(topic.slug)}
                      onCheckedChange={() =>
                        update(
                          "topicSlugs",
                          toggleValue(form.topicSlugs, topic.slug)
                        )
                      }
                    >
                      {localizeName(topic.name, locale)}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </Field>
            <Field>
              <FieldLabel htmlFor="featured-rank">
                {t("featuredRank")}
              </FieldLabel>
              <Input
                id="featured-rank"
                type="number"
                min={1}
                value={form.featuredRank ?? ""}
                onChange={(event) =>
                  update(
                    "featuredRank",
                    event.target.value ? Number(event.target.value) : undefined
                  )
                }
              />
            </Field>
          </FieldGroup>
          <InstructorManager
            instructors={referenceData.instructors}
            selectedIds={form.instructorIds}
            locale={locale}
            onSelectedChange={(ids) => update("instructorIds", ids)}
            onChanged={(instructors) =>
              onReferenceDataChanged({ ...referenceData, instructors })
            }
          />
          <FieldError className="mt-4">
            {(errors as Record<string, string | undefined>).form}
          </FieldError>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("coverImage")}</CardTitle>
          <CardDescription>{t("coverImageHint")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex aspect-video w-full max-w-xs items-center justify-center overflow-hidden border bg-muted/20">
              {content.coverUrl ? (
                <img
                  src={content.coverUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <ImageIcon
                  className="size-8 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void uploadCover(file)
                  event.currentTarget.value = ""
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={coverBusy}
                onClick={() => coverInputRef.current?.click()}
              >
                {content.coverUrl ? t("replaceCover") : t("uploadCover")}
              </Button>
              {content.coverUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={coverBusy}
                  onClick={() => void removeCover()}
                >
                  <XIcon data-icon="inline-start" aria-hidden="true" />
                  {t("removeCover")}
                </Button>
              )}
            </div>
          </div>
          {coverBusy && (
            <Progress value={coverProgress} aria-label={t("uploadProgress")}>
              <ProgressLabel>{t("uploadProgress")}</ProgressLabel>
              <ProgressValue />
            </Progress>
          )}
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button type="submit" disabled={busy}>
          {busy ? t("loading") : t("saveMetadata")}
          <CheckIcon data-icon="inline-end" aria-hidden="true" />
        </Button>
      </div>
    </form>
  )
}

function LocalizedTextField({
  id,
  label,
  value,
  onChange,
  error,
  dir,
  multiline,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  dir?: "rtl"
  multiline?: boolean
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {multiline ? (
        <Textarea
          id={id}
          dir={dir}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
        />
      ) : (
        <Input
          id={id}
          dir={dir}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
        />
      )}
      <FieldError>{error}</FieldError>
    </Field>
  )
}

function toForm(content: LearningContent): ContentMetadataInput {
  return {
    title: content.title.en,
    titleAr: content.title.ar,
    slug: content.slug,
    summary: content.summary.en,
    summaryAr: content.summary.ar,
    description: content.description.en,
    descriptionAr: content.description.ar,
    visibility: content.visibility,
    spokenLanguage: content.spokenLanguage,
    levelSlug: content.level.slug,
    topicSlugs: content.topics.map((topic) => topic.slug),
    instructorIds: content.instructors.map((instructor) => instructor.id),
    featuredRank: content.featuredRank,
  }
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
}

function localizeName(value: { en: string; ar?: string }, locale: "en" | "ar") {
  return value[locale] || value.en
}
