import * as React from "react"
import { Button } from "@/components/ui/button"
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { createDraft } from "@/lib/api"
import { useLocale } from "@/lib/locale-context"
import type {
  ContentKind,
  ContentVisibility,
  LearningContent,
} from "@/types/content"

export function ContentCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (content: LearningContent) => void
}) {
  const { t } = useLocale()
  const [kind, setKind] = React.useState<ContentKind>("COURSE")
  const [visibility, setVisibility] =
    React.useState<ContentVisibility>("PUBLIC")
  const [title, setTitle] = React.useState("")
  const [slug, setSlug] = React.useState("")
  const [summary, setSummary] = React.useState("")
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setKind("COURSE")
      setVisibility("PUBLIC")
      setTitle("")
      setSlug("")
      setSummary("")
      setError("")
    }
  }, [open])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !summary.trim() || !slug.trim()) {
      setError(t("requiredField"))
      return
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim())) {
      setError(t("invalidSlug"))
      return
    }
    setBusy(true)
    try {
      const created = await createDraft({
        title: title.trim(),
        slug: slug.trim(),
        summary: summary.trim(),
        kind,
        visibility,
      })
      onCreated(created)
      onOpenChange(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("saveFailed"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
          <DialogDescription>{t("createDescription")}</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="create-title">{t("title")}</FieldLabel>
              <Input
                id="create-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                aria-invalid={Boolean(error && !title)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="create-slug">{t("slug")}</FieldLabel>
              <Input
                id="create-slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                aria-invalid={Boolean(error && !slug)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="create-summary">{t("summary")}</FieldLabel>
              <Textarea
                id="create-summary"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                aria-invalid={Boolean(error && !summary)}
              />
            </Field>
            <Field>
              <FieldLabel>{t("kind")}</FieldLabel>
              <ToggleGroup
                value={[kind]}
                onValueChange={(values) =>
                  values[0] && setKind(values[0] as ContentKind)
                }
                variant="selection"
                aria-label={t("kind")}
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
              <FieldLabel>{t("visibility")}</FieldLabel>
              <ToggleGroup
                value={[visibility]}
                onValueChange={(values) =>
                  values[0] && setVisibility(values[0] as ContentVisibility)
                }
                variant="selection"
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
          </FieldGroup>
          <FieldError>{error}</FieldError>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? t("loading") : t("saveDraft")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
