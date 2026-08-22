import {
  ArrowSquareOutIcon,
  DownloadSimpleIcon,
  FileIcon,
  PaperclipIcon,
} from "@phosphor-icons/react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useLocale } from "@/lib/locale-context"
import type { Attachment } from "@/types/content"

export function AttachmentsSection({
  attachments = [],
}: {
  attachments?: Attachment[]
}) {
  const { locale, t } = useLocale()
  const ready = attachments
    .filter((attachment) => attachment.status === "READY" && attachment.url)
    .sort((left, right) => left.position - right.position)

  return (
    <Accordion className="border px-4">
      <AccordionItem value="attachments" className="border-0">
        <AccordionTrigger
          disabled={!ready.length}
          className="items-center py-3 text-sm no-underline hover:no-underline"
        >
          <span className="flex items-center gap-2">
            <PaperclipIcon aria-hidden="true" />
            {ready.length
              ? `${t("attachments")} · ${ready.length}`
              : t("noAttachmentsAvailable")}
          </span>
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <p className="mb-2 text-xs text-muted-foreground">
            {t("attachmentsDescription")}
          </p>
          {ready.map((attachment, index) => {
            const pdf = attachment.contentType === "application/pdf"
            return (
              <div key={attachment.id}>
                {index > 0 && <Separator />}
                <div className="flex items-center gap-3 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center bg-primary/10 text-primary">
                    <FileIcon aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {(locale === "ar" && attachment.titleAr) ||
                        attachment.titleEn}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {attachment.filename} ·{" "}
                      {formatBytes(attachment.contentLength)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <a
                        href={attachment.url}
                        target={pdf ? "_blank" : undefined}
                        rel={pdf ? "noreferrer" : undefined}
                        download={pdf ? undefined : attachment.filename}
                      />
                    }
                    nativeButton={false}
                  >
                    {pdf ? (
                      <ArrowSquareOutIcon data-icon="inline-start" />
                    ) : (
                      <DownloadSimpleIcon data-icon="inline-start" />
                    )}
                    {pdf ? t("openAttachment") : t("downloadAttachment")}
                  </Button>
                </div>
              </div>
            )
          })}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
