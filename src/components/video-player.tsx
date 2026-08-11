import MuxPlayer from "@mux/mux-player-react"
import { VideoCameraIcon } from "@phosphor-icons/react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useLocale } from "@/lib/locale-context"
import type { ContentUnit } from "@/types/content"

export function VideoPlayer({
  unit,
  title,
}: {
  unit: ContentUnit
  title: string
}) {
  const { t } = useLocale()
  const media = unit.media

  if (media.status !== "READY" || !media.playbackId) {
    return (
      <div className="grid aspect-video place-items-center border bg-muted/30 p-6">
        <Alert className="max-w-xl bg-background">
          <VideoCameraIcon aria-hidden="true" />
          <AlertTitle>{t("playerUnavailable")}</AlertTitle>
          <AlertDescription>
            {t("playerUnavailableDescription")}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (media.provider === "LOCAL") {
    return (
      <video
        className="aspect-video w-full bg-foreground"
        src={media.playbackId}
        controls
        preload="metadata"
      >
        <track kind="captions" />
      </video>
    )
  }

  return (
    <MuxPlayer
      playbackId={media.playbackId}
      tokens={
        media.playbackToken ? { playback: media.playbackToken } : undefined
      }
      metadata={{ video_id: media.id, video_title: title }}
      accentColor="var(--primary)"
      className="aspect-video w-full"
    />
  )
}
