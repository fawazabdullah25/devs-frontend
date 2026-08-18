import MuxPlayer from "@mux/mux-player-react"
import { VideoCameraIcon } from "@phosphor-icons/react"
import {
  isHLSProvider,
  MediaPlayer,
  MediaProvider,
  Track,
} from "@vidstack/react"
import type { MediaProviderAdapter } from "@vidstack/react"
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default"

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
  const playbackSource =
    media.provider === "MUX"
      ? media.playbackId
      : media.playbackUrl || media.playbackId

  if (media.status !== "READY" || !playbackSource) {
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
        src={playbackSource}
        controls
        preload="metadata"
      >
        <track kind="captions" />
      </video>
    )
  }

  if (media.provider === "STATIC_HLS") {
    const configureHls = (provider: MediaProviderAdapter | null) => {
      if (isHLSProvider(provider)) provider.library = () => import("hls.js")
    }

    return (
      <MediaPlayer
        className="devs-media-player aspect-video w-full overflow-hidden bg-black text-white"
        title={title}
        src={{ src: playbackSource, type: "application/x-mpegurl" }}
        crossOrigin
        playsInline
        onProviderChange={configureHls}
      >
        <MediaProvider>
          {media.captions.map((caption) => (
            <Track
              key={`${caption.language}-${caption.url}`}
              src={caption.url}
              kind="subtitles"
              label={caption.label}
              language={caption.language}
              default={caption.defaultTrack}
            />
          ))}
        </MediaProvider>
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>
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
