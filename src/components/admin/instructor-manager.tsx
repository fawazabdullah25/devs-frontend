import * as React from "react"
import { PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { createInstructor, updateInstructor } from "@/lib/api"
import { useLocale } from "@/lib/locale-context"
import { localize } from "@/types/content"
import type { Instructor, Locale } from "@/types/content"

type FormValues = {
  nameEn: string
  nameAr: string
  bioEn: string
  bioAr: string
  initials: string
  avatarUrl: string
}

const emptyForm: FormValues = {
  nameEn: "",
  nameAr: "",
  bioEn: "",
  bioAr: "",
  initials: "",
  avatarUrl: "",
}

export function InstructorManager({
  instructors,
  selectedIds,
  locale,
  onSelectedChange,
  onChanged,
}: {
  instructors: Instructor[]
  selectedIds: string[]
  locale: Locale
  onSelectedChange: (ids: string[]) => void
  onChanged: (instructors: Instructor[]) => void
}) {
  const { t } = useLocale()
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Instructor | null>(null)
  const [form, setForm] = React.useState<FormValues>(emptyForm)
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  const openForm = (instructor?: Instructor) => {
    setEditing(instructor ?? null)
    setForm(
      instructor
        ? {
            nameEn: instructor.name.en,
            nameAr: instructor.name.ar ?? "",
            bioEn: instructor.bio.en,
            bioAr: instructor.bio.ar ?? "",
            initials: instructor.initials,
            avatarUrl: instructor.avatarUrl ?? "",
          }
        : emptyForm
    )
    setError("")
    setOpen(true)
  }

  const toggle = (id: string) => {
    onSelectedChange(
      selectedIds.includes(id)
        ? selectedIds.filter((selected) => selected !== id)
        : [...selectedIds, id]
    )
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.nameEn.trim() || !form.bioEn.trim() || !form.initials.trim()) {
      setError(t("requiredField"))
      return
    }
    setBusy(true)
    setError("")
    try {
      const input = {
        nameEn: form.nameEn.trim(),
        nameAr: form.nameAr.trim() || undefined,
        bioEn: form.bioEn.trim(),
        bioAr: form.bioAr.trim() || undefined,
        initials: form.initials.trim().slice(0, 4),
        avatarUrl: form.avatarUrl.trim() || undefined,
      }
      const saved = editing
        ? await updateInstructor(editing.id, input)
        : await createInstructor(input)
      const next = editing
        ? instructors.map((item) => (item.id === saved.id ? saved : item))
        : [...instructors, saved]
      onChanged(next)
      if (!editing) onSelectedChange([...selectedIds, saved.id])
      setOpen(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("saveFailed"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t pt-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-medium">{t("instructors")}</h3>
          <p className="text-xs text-muted-foreground">
            {t("instructorProfiles")}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => openForm()}
        >
          <PlusIcon data-icon="inline-start" aria-hidden="true" />
          {t("addInstructor")}
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {instructors.map((instructor) => {
          const selected = selectedIds.includes(instructor.id)
          return (
            <div
              key={instructor.id}
              className={`flex items-center gap-3 border p-3 ${selected ? "border-primary bg-primary/5" : "bg-muted/10"}`}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 text-start focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                aria-pressed={selected}
                onClick={() => toggle(instructor.id)}
              >
                <Avatar size="sm">
                  {instructor.avatarUrl && (
                    <AvatarImage src={instructor.avatarUrl} alt="" />
                  )}
                  <AvatarFallback>{instructor.initials}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 truncate text-sm">
                  {localize(instructor.name, locale)}
                </span>
              </button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => openForm(instructor)}
                aria-label={`${t("editInstructor")}: ${localize(instructor.name, locale)}`}
              >
                <PencilSimpleIcon aria-hidden="true" />
              </Button>
            </div>
          )
        })}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("editInstructor") : t("addInstructor")}
            </DialogTitle>
            <DialogDescription>{t("instructorProfiles")}</DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-5" onSubmit={submit}>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="instructor-name-en">
                  {t("instructorNameEnglish")}
                </FieldLabel>
                <Input
                  id="instructor-name-en"
                  value={form.nameEn}
                  onChange={(event) =>
                    setForm({ ...form, nameEn: event.target.value })
                  }
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="instructor-name-ar">
                  {t("instructorNameArabic")}
                </FieldLabel>
                <Input
                  id="instructor-name-ar"
                  dir="rtl"
                  value={form.nameAr}
                  onChange={(event) =>
                    setForm({ ...form, nameAr: event.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="instructor-bio-en">
                  {t("instructorBioEnglish")}
                </FieldLabel>
                <Textarea
                  id="instructor-bio-en"
                  value={form.bioEn}
                  onChange={(event) =>
                    setForm({ ...form, bioEn: event.target.value })
                  }
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="instructor-bio-ar">
                  {t("instructorBioArabic")}
                </FieldLabel>
                <Textarea
                  id="instructor-bio-ar"
                  dir="rtl"
                  value={form.bioAr}
                  onChange={(event) =>
                    setForm({ ...form, bioAr: event.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="instructor-initials">
                  {t("initials")}
                </FieldLabel>
                <Input
                  id="instructor-initials"
                  maxLength={4}
                  value={form.initials}
                  onChange={(event) =>
                    setForm({ ...form, initials: event.target.value })
                  }
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="instructor-avatar">
                  {t("avatarUrl")}
                </FieldLabel>
                <Input
                  id="instructor-avatar"
                  type="url"
                  value={form.avatarUrl}
                  onChange={(event) =>
                    setForm({ ...form, avatarUrl: event.target.value })
                  }
                />
              </Field>
            </FieldGroup>
            <FieldError>{error}</FieldError>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={busy}>
                {editing ? t("saveChanges") : t("createInstructor")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
