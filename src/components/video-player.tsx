import * as React from "react"
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
import { arabicVidstackTranslations } from "@/lib/vidstack-translations"
import type { ContentUnit } from "@/types/content"

const HLS_PLAYBACK_RATES = {
  min: 0.25,
  max: 2,
  step: 0.25,
}

export function VideoPlayer({
  unit,
  title,
}: {
  unit: ContentUnit
  title: string
}) {
  const { t } = useLocale()
  const media = unit.media
  const playbackSource = media.playbackUrl

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

  return (
    <StaticHlsPlayer
      media={media}
      playbackSource={playbackSource}
      title={title}
    />
  )
}

function StaticHlsPlayer({
  media,
  playbackSource,
  title,
}: {
  media: ContentUnit["media"]
  playbackSource: string
  title: string
}) {
  const { direction, locale, t } = useLocale()
  const providerRef = React.useRef<MediaProviderAdapter | null>(null)
  const [aspectRatio, setAspectRatio] = React.useState("16 / 11")

  const configureHls = React.useCallback(
    (provider: MediaProviderAdapter | null) => {
      providerRef.current = provider
      if (isHLSProvider(provider)) provider.library = () => import("hls.js")
    },
    []
  )

  const syncAspectRatio = React.useCallback(() => {
    const provider = providerRef.current
    if (!isHLSProvider(provider)) return

    const { videoHeight, videoWidth } = provider.video
    if (videoWidth > 0 && videoHeight > 0) {
      setAspectRatio(`${videoWidth} / ${videoHeight}`)
    }
  }, [])

  return (
    <MediaPlayer
      className="devs-media-player w-full overflow-hidden bg-black text-white"
      title={title}
      src={{ src: playbackSource, type: "application/x-mpegurl" }}
      crossOrigin
      playsInline
      dir={direction}
      style={{ aspectRatio }}
      onLoadedMetadata={syncAspectRatio}
      onProviderChange={configureHls}
    >
      <MediaProvider>
        {media.captions.map((caption) => {
          const language = caption.language.toLowerCase()
          const label =
            locale === "ar" && language.startsWith("en")
              ? t("englishCaptions")
              : locale === "ar" && language.startsWith("ar")
                ? t("arabicCaptions")
                : caption.label

          return (
            <Track
              key={`${caption.language}-${caption.url}`}
              src={caption.url}
              kind="subtitles"
              label={label}
              language={caption.language}
              default={caption.defaultTrack}
            />
          )
        })}
      </MediaProvider>
      <DefaultVideoLayout
        icons={defaultLayoutIcons}
        playbackRates={HLS_PLAYBACK_RATES}
        translations={locale === "ar" ? arabicVidstackTranslations : null}
      />
    </MediaPlayer>
  )
}
