import * as React from "react"
import { PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react"

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
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { toast } from "@/components/ui/toast"
import { createTag, deleteTag, updateTag } from "@/lib/api"
import { useLocale } from "@/lib/locale-context"
import type { Tag, TagGroup } from "@/types/content"

type FormValues = {
  group: TagGroup
  nameEn: string
  nameAr: string
  slug: string
}

const emptyForm: FormValues = {
  group: "TOPIC",
  nameEn: "",
  nameAr: "",
  slug: "",
}

const groupOrder: TagGroup[] = ["TOPIC", "DIFFICULTY", "GENERAL"]

export function TagManager({
  tags,
  onChanged,
}: {
  tags: Tag[]
  onChanged?: (tags: Tag[]) => void
}) {
  const { t } = useLocale()
  const [items, setItems] = React.useState(tags)
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Tag | null>(null)
  const [form, setForm] = React.useState<FormValues>(emptyForm)
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => setItems(tags), [tags])

  const openForm = (tag?: Tag) => {
    setEditing(tag ?? null)
    setForm(
      tag
        ? {
            group: tag.group,
            nameEn: tag.name.en,
            nameAr: tag.name.ar ?? "",
            slug: tag.slug,
          }
        : emptyForm
    )
    setError("")
    setOpen(true)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const nameEn = form.nameEn.trim()
    const slug = form.slug.trim().toLowerCase()
    if (!nameEn || !slug) {
      setError(t("requiredField"))
      return
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setError(t("invalidSlug"))
      return
    }
    setBusy(true)
    setError("")
    try {
      const input = {
        group: form.group,
        nameEn,
        nameAr: form.nameAr.trim() || undefined,
        slug,
      }
      const saved = editing
        ? await updateTag(editing.id, input)
        : await createTag(input)
      const next = editing
        ? items.map((item) => (item.id === saved.id ? saved : item))
        : [...items, saved]
      setItems(next)
      onChanged?.(next)
      setOpen(false)
      toast.add({
        title: editing ? t("tagUpdated") : t("tagCreated"),
        type: "success",
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("saveFailed"))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (tag: Tag) => {
    if (!window.confirm(t("deleteTagConfirm"))) return
    setBusy(true)
    try {
      await deleteTag(tag.id)
      const next = items.filter((item) => item.id !== tag.id)
      setItems(next)
      onChanged?.(next)
      toast.add({ title: t("tagDeleted"), type: "success" })
    } catch (caught) {
      toast.add({
        title: t("deleteTagFailed"),
        description:
          caught instanceof Error ? caught.message : t("deleteTagFailed"),
        type: "error",
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className="flex flex-col gap-4"
      aria-labelledby="tag-manager-title"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 id="tag-manager-title" className="font-medium">
            {t("tags")}
          </h3>
          <p className="text-xs text-muted-foreground">{t("tagsHint")}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => openForm()}
        >
          <PlusIcon data-icon="inline-start" aria-hidden="true" />
          {t("addTag")}
        </Button>
      </div>

      <div className="flex flex-col gap-5">
        {groupOrder.map((group) => {
          const groupTags = items.filter((tag) => tag.group === group)
          return (
            <div key={group} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium">{groupLabel(group, t)}</h4>
                <Badge variant="outline">{groupTags.length}</Badge>
              </div>
              {groupTags.length ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {groupTags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center gap-2 border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{tag.name.en}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {tag.slug}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`${t("editTag")}: ${tag.name.en}`}
                        onClick={() => openForm(tag)}
                      >
                        <PencilSimpleIcon aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={busy}
                        aria-label={`${t("deleteTag")}: ${tag.name.en}`}
                        onClick={() => void remove(tag)}
                      >
                        <TrashIcon aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t("noTagsFound")}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? t("editTag") : t("addTag")}</DialogTitle>
            <DialogDescription>{t("tagsHint")}</DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
            <FieldGroup>
              <Field>
                <FieldLabel>{t("tagGroup")}</FieldLabel>
                <ToggleGroup
                  value={[form.group]}
                  onValueChange={(values) =>
                    values[0] &&
                    setForm({ ...form, group: values[0] as TagGroup })
                  }
                  variant="selection"
                  aria-label={t("tagGroup")}
                >
                  {groupOrder.map((group) => (
                    <ToggleGroupItem key={group} type="button" value={group}>
                      {groupLabel(group, t)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor="tag-name-en">
                  {t("tagNameEnglish")}
                </FieldLabel>
                <Input
                  id="tag-name-en"
                  value={form.nameEn}
                  onChange={(event) =>
                    setForm({ ...form, nameEn: event.target.value })
                  }
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="tag-name-ar">
                  {t("tagNameArabic")}
                </FieldLabel>
                <Input
                  id="tag-name-ar"
                  dir="rtl"
                  value={form.nameAr}
                  onChange={(event) =>
                    setForm({ ...form, nameAr: event.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="tag-slug">{t("tagSlug")}</FieldLabel>
                <Input
                  id="tag-slug"
                  value={form.slug}
                  onChange={(event) =>
                    setForm({ ...form, slug: event.target.value })
                  }
                  required
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
                {editing ? t("saveChanges") : t("createTag")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function groupLabel(group: TagGroup, t: ReturnType<typeof useLocale>["t"]) {
  if (group === "TOPIC") return t("topicTags")
  if (group === "DIFFICULTY") return t("difficultyTags")
  return t("generalTags")
}
