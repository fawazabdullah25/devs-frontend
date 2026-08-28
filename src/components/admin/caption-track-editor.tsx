import * as React from "react"
import { PlusIcon, TrashIcon, UploadSimpleIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useLocale } from "@/lib/locale-context"

export interface CaptionDraft {
  id: string
  language: string
  label: string
  path: string
  defaultTrack: boolean
}

export function emptyCaption(language = ""): CaptionDraft {
  return {
    id: crypto.randomUUID(),
    language,
    label: language === "ar" ? "العربية" : language === "en" ? "English" : "",
    path: "",
    defaultTrack: false,
  }
}

export function CaptionTrackEditor({
  value,
  onChange,
  disabled,
  onUpload,
}: {
  value: CaptionDraft[]
  onChange: (value: CaptionDraft[]) => void
  disabled?: boolean
  /**
   * Upload a standalone WebVTT file and return the relative object path that
   * should be stored with the caption track. Keeping the storage operation
   * outside this presentational editor lets add/manage lesson flows share the
   * same UI while the API adapter owns authentication and signed uploads.
   */
  onUpload?: (file: File) => Promise<string>
}) {
  const { t } = useLocale()
  const fileRefs = React.useRef<Array<HTMLInputElement | null>>([])
  const [uploadingId, setUploadingId] = React.useState<string | null>(null)
  const [uploadError, setUploadError] = React.useState<string | null>(null)

  const update = (index: number, patch: Partial<CaptionDraft>) => {
    onChange(
      value.map((caption, candidate) =>
        candidate === index ? { ...caption, ...patch } : caption
      )
    )
  }

  const chooseDefault = (index: number, checked: boolean) => {
    onChange(
      value.map((caption, candidate) => ({
        ...caption,
        defaultTrack: checked && candidate === index,
      }))
    )
  }

  const upload = async (index: number, captionId: string, file: File) => {
    if (!onUpload) return
    setUploadingId(captionId)
    setUploadError(null)
    try {
      const path = await onUpload(file)
      update(index, { path })
    } catch (caught) {
      setUploadError(caught instanceof Error ? caught.message : t("saveFailed"))
    } finally {
      setUploadingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="font-medium">{t("captions")}</h3>
        <p className="text-xs text-muted-foreground">
          {t("captionsEditorDescription")}
        </p>
      </div>

      {value.map((caption, index) => (
        <div
          key={caption.id}
          className="flex flex-col gap-4 border bg-muted/10 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium">
              {t("captionTrack")} {index + 1}
            </p>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              disabled={disabled || uploadingId !== null}
              aria-label={t("removeCaption")}
              onClick={() =>
                onChange(value.filter((_, candidate) => candidate !== index))
              }
            >
              <TrashIcon aria-hidden="true" />
            </Button>
          </div>
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`caption-language-${caption.id}`}>
                {t("captionLanguage")}
              </FieldLabel>
              <Input
                id={`caption-language-${caption.id}`}
                dir="ltr"
                placeholder="en"
                value={caption.language}
                disabled={disabled}
                onChange={(event) =>
                  update(index, { language: event.target.value })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`caption-label-${caption.id}`}>
                {t("captionLabel")}
              </FieldLabel>
              <Input
                id={`caption-label-${caption.id}`}
                value={caption.label}
                disabled={disabled}
                onChange={(event) =>
                  update(index, { label: event.target.value })
                }
              />
            </Field>
          </FieldGroup>
          <Field>
            <FieldLabel htmlFor={`caption-path-${caption.id}`}>
              {t("captionPath")}
            </FieldLabel>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id={`caption-path-${caption.id}`}
                dir="ltr"
                placeholder={t("optionalVttPath")}
                value={caption.path}
                disabled={disabled}
                onChange={(event) =>
                  update(index, { path: event.target.value })
                }
              />
              {onUpload && (
                <>
                  <input
                    ref={(element) => {
                      fileRefs.current[index] = element
                    }}
                    type="file"
                    accept=".vtt,text/vtt"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) void upload(index, caption.id, file)
                      event.currentTarget.value = ""
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={disabled || uploadingId !== null}
                    onClick={() => fileRefs.current[index]?.click()}
                  >
                    <UploadSimpleIcon
                      data-icon="inline-start"
                      aria-hidden="true"
                    />
                    {uploadingId === caption.id ? t("loading") : t("uploadVtt")}
                  </Button>
                </>
              )}
            </div>
          </Field>
          <Field orientation="horizontal">
            <Switch
              id={`caption-default-${caption.id}`}
              checked={caption.defaultTrack}
              disabled={disabled}
              onCheckedChange={(checked) => chooseDefault(index, checked)}
            />
            <FieldLabel htmlFor={`caption-default-${caption.id}`}>
              {t("defaultCaption")}
            </FieldLabel>
          </Field>
        </div>
      ))}

      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}

      <Button
        type="button"
        variant="outline"
        className="w-fit"
        disabled={disabled}
        onClick={() => onChange([...value, emptyCaption()])}
      >
        <PlusIcon data-icon="inline-start" aria-hidden="true" />
        {t("addCaption")}
      </Button>
    </div>
  )
}
