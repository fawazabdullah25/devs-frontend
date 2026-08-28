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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Slider } from "@/components/ui/slider"
import { toast } from "@/components/ui/toast"
import { useLocale } from "@/lib/locale-context"
import { cn } from "@/lib/utils"

type CropShape = "rectangle" | "circle"

export function ImageCropDialog({
  file,
  aspect,
  outputWidth,
  outputHeight,
  shape = "rectangle",
  onCancel,
  onCropped,
}: {
  file: File | null
  aspect: number
  outputWidth: number
  outputHeight: number
  shape?: CropShape
  onCancel: () => void
  onCropped: (file: File) => void | Promise<void>
}) {
  const { t } = useLocale()
  const sourceUrl = useObjectUrl(file)
  const imageRef = React.useRef<HTMLImageElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const [zoom, setZoom] = React.useState(1)
  const [horizontal, setHorizontal] = React.useState(50)
  const [vertical, setVertical] = React.useState(50)
  const [imageReady, setImageReady] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    setZoom(1)
    setHorizontal(50)
    setVertical(50)
    setImageReady(false)
  }, [file])

  const drawCrop = React.useCallback(() => {
    const image = imageRef.current
    const canvas = canvasRef.current
    if (!image || !canvas || !imageReady) return

    canvas.width = outputWidth
    canvas.height = outputHeight
    const context = canvas.getContext("2d")
    if (!context) return

    const sourceAspect = image.naturalWidth / image.naturalHeight
    let baseWidth: number
    let baseHeight: number
    if (sourceAspect > aspect) {
      baseHeight = image.naturalHeight
      baseWidth = baseHeight * aspect
    } else {
      baseWidth = image.naturalWidth
      baseHeight = baseWidth / aspect
    }

    const cropWidth = baseWidth / zoom
    const cropHeight = baseHeight / zoom
    const sourceX = (image.naturalWidth - cropWidth) * (horizontal / 100)
    const sourceY = (image.naturalHeight - cropHeight) * (vertical / 100)

    context.clearRect(0, 0, outputWidth, outputHeight)
    context.drawImage(
      image,
      sourceX,
      sourceY,
      cropWidth,
      cropHeight,
      0,
      0,
      outputWidth,
      outputHeight
    )
  }, [
    aspect,
    horizontal,
    imageReady,
    outputHeight,
    outputWidth,
    vertical,
    zoom,
  ])

  React.useEffect(() => drawCrop(), [drawCrop])

  const confirm = async () => {
    const canvas = canvasRef.current
    if (!canvas || !file) return
    setBusy(true)
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) =>
            result ? resolve(result) : reject(new Error(t("cropFailed"))),
          "image/webp",
          0.9
        )
      })
      const basename = file.name.replace(/\.[^.]+$/, "") || "image"
      await onCropped(
        new File([blob], `${basename}-cropped.webp`, { type: "image/webp" })
      )
    } catch (caught) {
      toast.add({
        title: t("cropFailed"),
        description: caught instanceof Error ? caught.message : t("cropFailed"),
        type: "error",
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={Boolean(file)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{t("cropImage")}</DialogTitle>
          <DialogDescription>{t("cropImageDescription")}</DialogDescription>
        </DialogHeader>

        <div className="grid items-center gap-6 lg:grid-cols-2">
          <div className="flex min-h-80 items-center justify-center border bg-muted/20 p-4 lg:min-h-[28rem]">
            {sourceUrl && (
              <img
                ref={imageRef}
                src={sourceUrl}
                alt={t("fullImagePreview")}
                className="max-h-[27rem] max-w-full object-contain"
                onLoad={() => setImageReady(true)}
              />
            )}
          </div>
          <div
            className={cn(
              "mx-auto w-full max-w-2xl overflow-hidden border bg-muted/20",
              shape === "circle" && "max-w-md rounded-full"
            )}
            style={{ aspectRatio: aspect }}
          >
            <canvas
              ref={canvasRef}
              className="size-full"
              aria-label={t("croppedImagePreview")}
            />
          </div>
        </div>

        <FieldGroup className="grid gap-5 border bg-muted/20 p-4 md:grid-cols-3">
          <Field>
            <FieldLabel className="whitespace-nowrap">
              {t("zoom")} · {zoom.toFixed(2)}×
            </FieldLabel>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.05}
              onValueChange={(value) =>
                setZoom(typeof value === "number" ? value : (value[0] ?? 1))
              }
              aria-label={t("zoom")}
            />
          </Field>
          <Field>
            <FieldLabel className="whitespace-nowrap">
              {t("horizontalPosition")} · {Math.round(horizontal)}%
            </FieldLabel>
            <Slider
              value={[horizontal]}
              min={0}
              max={100}
              step={1}
              onValueChange={(value) =>
                setHorizontal(
                  typeof value === "number" ? value : (value[0] ?? 50)
                )
              }
              aria-label={t("horizontalPosition")}
            />
          </Field>
          <Field>
            <FieldLabel className="whitespace-nowrap">
              {t("verticalPosition")} · {Math.round(vertical)}%
            </FieldLabel>
            <Slider
              value={[vertical]}
              min={0}
              max={100}
              step={1}
              onValueChange={(value) =>
                setVertical(
                  typeof value === "number" ? value : (value[0] ?? 50)
                )
              }
              aria-label={t("verticalPosition")}
            />
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            disabled={!imageReady || busy}
            onClick={() => void confirm()}
          >
            {busy ? t("loading") : t("applyCrop")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
