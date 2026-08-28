import * as React from "react"
import {
  CaretDownIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Field,
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
import { Textarea } from "@/components/ui/textarea"
import {
  completeInstructorAvatarUpload,
  createInstructor,
  deleteInstructor,
  deleteInstructorAvatar,
  getInstructors,
  requestInstructorAvatarUpload,
  updateInstructor,
  uploadInstructorAvatar,
} from "@/lib/api"
import { useLocale } from "@/lib/locale-context"
import { toast } from "@/components/ui/toast"
import { localize } from "@/types/content"
import type { Instructor, Locale } from "@/types/content"
import { ImageCropDialog } from "./image-crop-dialog"

type FormValues = {
  nameEn: string
  nameAr: string
  bioEn: string
  bioAr: string
  initials: string
}

const emptyForm: FormValues = {
  nameEn: "",
  nameAr: "",
  bioEn: "",
  bioAr: "",
  initials: "",
}

export function InstructorManager({
  instructors,
  selectedIds,
  locale,
  onSelectedChange,
  onChanged,
  manageProfiles = false,
}: {
  instructors: Instructor[]
  selectedIds: string[]
  locale: Locale
  onSelectedChange: (ids: string[]) => void
  onChanged?: (instructors: Instructor[]) => void
  manageProfiles?: boolean
}) {
  const { t } = useLocale()
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Instructor | null>(null)
  const [form, setForm] = React.useState<FormValues>(emptyForm)
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null)
  const [pendingAvatar, setPendingAvatar] = React.useState<File | null>(null)
  const [avatarProgress, setAvatarProgress] = React.useState(0)
  const avatarPreviewUrl = useObjectUrl(avatarFile)

  const selected = instructors.filter((instructor) =>
    selectedIds.includes(instructor.id)
  )
  const available = instructors.filter((instructor) => {
    const needle = query.trim().toLowerCase()
    return (
      !needle ||
      [
        instructor.name.en,
        instructor.name.ar,
        instructor.bio.en,
        instructor.bio.ar,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle))
    )
  })

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
          }
        : emptyForm
    )
    setAvatarFile(null)
    setPendingAvatar(null)
    setAvatarProgress(0)
    setError("")
    setOpen(true)
  }

  const toggle = (id: string) =>
    onSelectedChange(
      selectedIds.includes(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id]
    )

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
      }
      const saved = editing
        ? await updateInstructor(editing.id, input)
        : await createInstructor(input)
      if (avatarFile) {
        if (!/^image\/(jpeg|png|webp|avif)$/.test(avatarFile.type))
          throw new Error(t("avatarImageHint"))
        const grant = await requestInstructorAvatarUpload(saved.id, avatarFile)
        await uploadInstructorAvatar(grant, avatarFile, setAvatarProgress)
        await completeInstructorAvatarUpload(saved.id, grant.avatar.id)
      }
      const refreshed = onChanged ? await getInstructors() : [saved]
      const next = editing
        ? refreshed.length
          ? refreshed
          : instructors.map((item) => (item.id === saved.id ? saved : item))
        : refreshed.length
          ? refreshed
          : [...instructors, saved]
      onChanged?.(next)
      if (!editing) onSelectedChange([...selectedIds, saved.id])
      setOpen(false)
      toast.add({
        title: editing ? t("instructorUpdated") : t("instructorCreated"),
        type: "success",
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("saveFailed"))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (instructor: Instructor) => {
    if (!window.confirm(t("deleteInstructorConfirm"))) return
    setBusy(true)
    try {
      await deleteInstructor(instructor.id)
      onChanged?.(instructors.filter((item) => item.id !== instructor.id))
      onSelectedChange(selectedIds.filter((id) => id !== instructor.id))
      toast.add({ title: t("instructorDeleted"), type: "success" })
    } catch (caught) {
      toast.add({
        title: t("deleteInstructorFailed"),
        description:
          caught instanceof Error
            ? caught.message
            : t("deleteInstructorFailed"),
        type: "error",
      })
    } finally {
      setBusy(false)
    }
  }

  const removeAvatar = async () => {
    if (!editing) return
    setBusy(true)
    try {
      await deleteInstructorAvatar(editing.id)
      const refreshed = await getInstructors()
      onChanged?.(refreshed)
      setEditing(refreshed.find((item) => item.id === editing.id) ?? editing)
      toast.add({ title: t("avatarRemoved"), type: "success" })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("saveFailed"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-medium">{t("instructors")}</h3>
          <p className="text-xs text-muted-foreground">
            {manageProfiles ? t("instructorProfiles") : t("selectInstructors")}
          </p>
        </div>
        {manageProfiles && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => openForm()}
          >
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            {t("addInstructor")}
          </Button>
        )}
      </div>

      {!manageProfiles && selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((instructor) => (
            <Badge
              key={instructor.id}
              variant="secondary"
              className="gap-2 pe-1"
            >
              <Avatar className="size-4">
                {instructor.avatarUrl && (
                  <AvatarImage src={instructor.avatarUrl} alt="" />
                )}
                <AvatarFallback className="text-[0.5rem]">
                  {instructor.initials}
                </AvatarFallback>
              </Avatar>
              {localize(instructor.name, locale)}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="rounded-full"
                aria-label={`${t("removeInstructor")}: ${localize(instructor.name, locale)}`}
                onClick={() => toggle(instructor.id)}
              >
                <XIcon aria-hidden="true" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {!manageProfiles && (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between"
              />
            }
          >
            {selected.length ? t("editInstructors") : t("selectInstructors")}
            <CaretDownIcon data-icon="inline-end" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-96 w-(--anchor-width) min-w-64 p-1"
          >
            <Input
              value={query}
              placeholder={t("searchInstructors")}
              aria-label={t("searchInstructors")}
              className="mb-1"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
            />
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t("instructors")}</DropdownMenuLabel>
              {available.map((instructor) => (
                <DropdownMenuCheckboxItem
                  key={instructor.id}
                  checked={selectedIds.includes(instructor.id)}
                  onCheckedChange={() => toggle(instructor.id)}
                  onSelect={(event) => event.preventDefault()}
                >
                  <Avatar size="sm">
                    {instructor.avatarUrl && (
                      <AvatarImage src={instructor.avatarUrl} alt="" />
                    )}
                    <AvatarFallback>{instructor.initials}</AvatarFallback>
                  </Avatar>
                  {localize(instructor.name, locale)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
            {!available.length && (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                {t("noInstructorsFound")}
              </p>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {manageProfiles && instructors.length > 0 && (
        <div className="flex flex-col gap-2 pt-2">
          {instructors.map((instructor) => (
            <div
              key={instructor.id}
              className="flex items-center gap-3 border p-3"
            >
              <Avatar size="sm">
                {instructor.avatarUrl && (
                  <AvatarImage src={instructor.avatarUrl} alt="" />
                )}
                <AvatarFallback>{instructor.initials}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-sm">
                {localize(instructor.name, locale)}
              </span>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => openForm(instructor)}
                aria-label={`${t("editInstructor")}: ${localize(instructor.name, locale)}`}
              >
                <PencilSimpleIcon aria-hidden="true" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => void remove(instructor)}
                aria-label={`${t("deleteInstructor")}: ${localize(instructor.name, locale)}`}
              >
                <TrashIcon aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      )}

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
                <FieldLabel htmlFor="instructor-avatar-file">
                  {t("avatarImage")}
                </FieldLabel>
                <input
                  id="instructor-avatar-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="block w-full text-sm text-muted-foreground file:me-3 file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground"
                  onChange={(event) => {
                    setPendingAvatar(event.currentTarget.files?.[0] ?? null)
                    event.currentTarget.value = ""
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  {t("avatarImageHint")}
                </p>
                {avatarPreviewUrl && (
                  <Avatar size="lg">
                    <AvatarImage
                      src={avatarPreviewUrl}
                      alt={t("croppedImagePreview")}
                    />
                    <AvatarFallback>{form.initials || "KS"}</AvatarFallback>
                  </Avatar>
                )}
                {editing?.avatarUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void removeAvatar()}
                  >
                    <XIcon data-icon="inline-start" aria-hidden="true" />
                    {t("removeAvatar")}
                  </Button>
                )}
              </Field>
            </FieldGroup>
            {busy && avatarFile && (
              <Progress value={avatarProgress} aria-label={t("uploadProgress")}>
                <ProgressLabel>{t("uploadProgress")}</ProgressLabel>
                <ProgressValue />
              </Progress>
            )}
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
      <ImageCropDialog
        file={pendingAvatar}
        aspect={1}
        outputWidth={512}
        outputHeight={512}
        shape="circle"
        onCancel={() => setPendingAvatar(null)}
        onCropped={(file) => {
          setAvatarFile(file)
          setPendingAvatar(null)
        }}
      />
    </div>
  )
}

function useObjectUrl(file: File | null) {
  const [url, setUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!file) {
      setUrl(null)
      return
    }
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])

  return url
}
