import * as React from "react"
import {
  ArrowCounterClockwiseIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  FileArrowUpIcon,
  PencilSimpleIcon,
  PaperclipIcon,
  SpinnerGapIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
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
import { toast } from "@/components/ui/toast"
import {
  completeAttachment,
  deleteAttachment,
  getDeletedAttachments,
  requestAttachmentUpload,
  reorderAttachments,
  restoreAttachment,
  updateAttachment,
  uploadAttachment,
} from "@/lib/api"
import { useLocale } from "@/lib/locale-context"
import type { Attachment, ContentUnit } from "@/types/content"

const accepted =
  ".pdf,.zip,.ppt,.pptx,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,.gif,.c,.h,.cpp,.hpp,.cs,.go,.java,.js,.jsx,.json,.kt,.php,.py,.rb,.rs,.sh,.sql,.swift,.ts,.tsx,.xml,.yaml,.yml,.css"

export function AttachmentManager({
  unit,
  onChange,
}: {
  unit: ContentUnit
  onChange: (attachments: Attachment[]) => void
}) {
  const { t } = useLocale()
  const [title, setTitle] = React.useState("")
  const [titleAr, setTitleAr] = React.useState("")
  const [file, setFile] = React.useState<File | null>(null)
  const [progress, setProgress] = React.useState(0)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [removed, setRemoved] = React.useState<Attachment[]>([])
  const [editing, setEditing] = React.useState<string | null>(null)
  const [editTitle, setEditTitle] = React.useState("")
  const [editTitleAr, setEditTitleAr] = React.useState("")
  const attachments = unit.attachments ?? []

  React.useEffect(() => {
    let active = true
    getDeletedAttachments(unit.id)
      .then((items) => {
        if (active) setRemoved(items)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [unit.id])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!file || !title.trim()) {
      setError(t("requiredField"))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const grant = await requestAttachmentUpload(
        unit.id,
        file,
        title.trim(),
        titleAr.trim() || undefined
      )
      await uploadAttachment(grant, file, setProgress)
      const ready = await completeAttachment(unit.id, grant.attachment)
      onChange([...attachments, ready].sort((a, b) => a.position - b.position))
      setFile(null)
      setTitle("")
      setTitleAr("")
      setProgress(0)
      toast.add({ title: t("attachmentUploaded"), type: "success" })
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : t("attachmentUploadFailed")
      )
    } finally {
      setBusy(false)
    }
  }

  const remove = async (attachment: Attachment) => {
    try {
      await deleteAttachment(unit.id, attachment.id)
      onChange(attachments.filter((item) => item.id !== attachment.id))
      setRemoved((current) => [attachment, ...current])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("saveFailed"))
    }
  }

  const restore = async (attachment: Attachment) => {
    try {
      const restored = await restoreAttachment(
        unit.id,
        attachment.id,
        attachment
      )
      onChange(
        [...attachments, restored].sort((a, b) => a.position - b.position)
      )
      setRemoved((current) =>
        current.filter((item) => item.id !== attachment.id)
      )
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("saveFailed"))
    }
  }

  const beginEdit = (attachment: Attachment) => {
    setEditing(attachment.id)
    setEditTitle(attachment.titleEn)
    setEditTitleAr(attachment.titleAr ?? "")
  }

  const saveEdit = async (attachment: Attachment) => {
    if (!editTitle.trim()) return
    try {
      const updated = await updateAttachment(
        unit.id,
        attachment,
        editTitle.trim(),
        editTitleAr.trim() || undefined
      )
      onChange(
        attachments.map((item) => (item.id === updated.id ? updated : item))
      )
      setEditing(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("saveFailed"))
    }
  }

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= attachments.length) return
    const next = [...attachments]
    ;[next[index], next[target]] = [next[target], next[index]]
    try {
      onChange(await reorderAttachments(unit.id, next))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("saveFailed"))
    }
  }

  return (
    <div className="flex flex-col gap-4 border bg-background p-4">
      {attachments.length ? (
        <div className="flex flex-col gap-2">
          {attachments.map((attachment, index) => (
            <div
              key={attachment.id}
              className="flex flex-wrap items-center gap-3 border bg-muted/30 p-3"
            >
              <PaperclipIcon
                className="shrink-0 text-primary"
                aria-hidden="true"
              />
              {editing === attachment.id ? (
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                  <Input
                    aria-label={t("attachmentTitleEnglish")}
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                  />
                  <Input
                    aria-label={t("attachmentTitleArabic")}
                    dir="rtl"
                    value={editTitleAr}
                    onChange={(event) => setEditTitleAr(event.target.value)}
                  />
                </div>
              ) : (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {attachment.titleEn}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {attachment.filename}
                  </p>
                </div>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("moveAttachmentUp")}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUpIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("moveAttachmentDown")}
                disabled={index === attachments.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDownIcon />
              </Button>
              {editing === attachment.id ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("saveAttachment")}
                    onClick={() => saveEdit(attachment)}
                  >
                    <CheckIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("cancel")}
                    onClick={() => setEditing(null)}
                  >
                    <XIcon />
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("editAttachment")}
                  onClick={() => beginEdit(attachment)}
                >
                  <PencilSimpleIcon />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("deleteAttachment")}
                onClick={() => remove(attachment)}
              >
                <TrashIcon />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <Empty className="py-5">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PaperclipIcon />
            </EmptyMedia>
            <EmptyTitle>{t("noAttachments")}</EmptyTitle>
            <EmptyDescription>{t("noAttachmentsDescription")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {removed.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center gap-3 border border-dashed p-3 text-muted-foreground"
        >
          <span className="min-w-0 flex-1 truncate text-xs">
            {attachment.titleEn} · {t("retainedSevenDays")}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => restore(attachment)}
          >
            <ArrowCounterClockwiseIcon data-icon="inline-start" />
            {t("restore")}
          </Button>
        </div>
      ))}

      <form onSubmit={submit} className="flex flex-col gap-4">
        <FieldGroup>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`attachment-title-${unit.id}`}>
                {t("attachmentTitleEnglish")}
              </FieldLabel>
              <Input
                id={`attachment-title-${unit.id}`}
                value={title}
                disabled={busy}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`attachment-title-ar-${unit.id}`}>
                {t("attachmentTitleArabic")}
              </FieldLabel>
              <Input
                id={`attachment-title-ar-${unit.id}`}
                dir="rtl"
                value={titleAr}
                disabled={busy}
                onChange={(event) => setTitleAr(event.target.value)}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor={`attachment-file-${unit.id}`}>
              {t("attachmentFile")}
            </FieldLabel>
            <Input
              id={`attachment-file-${unit.id}`}
              type="file"
              accept={accepted}
              disabled={busy}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            {error && <FieldError>{error}</FieldError>}
          </Field>
        </FieldGroup>
        {busy && (
          <Progress value={progress}>
            <ProgressLabel>{t("uploadingAttachment")}</ProgressLabel>
            <ProgressValue>{() => `${progress}%`}</ProgressValue>
          </Progress>
        )}
        <Button type="submit" disabled={busy || attachments.length >= 20}>
          {busy ? (
            <SpinnerGapIcon className="animate-spin" />
          ) : (
            <FileArrowUpIcon />
          )}
          {t("uploadAttachment")}
        </Button>
      </form>
    </div>
  )
}
