// @vitest-environment jsdom

import * as React from "react"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { VideoPlayer } from "@/components/video-player"
import type { ContentUnit } from "@/types/content"

const localeState = vi.hoisted(() => ({ locale: "en" }))

vi.mock("@/lib/locale-context", () => ({
  useLocale: () => ({
    direction: localeState.locale === "ar" ? "rtl" : "ltr",
    locale: localeState.locale,
    t: (key: string) =>
      localeState.locale === "ar"
        ? {
            arabicCaptions: "الترجمة العربية",
            englishCaptions: "الترجمة الإنجليزية",
          }[key] || key
        : key,
  }),
}))

vi.mock("@mux/mux-player-react", () => ({
  default: ({ playbackId }: { playbackId: string }) => (
    <div data-testid="mux-player" data-playback-id={playbackId} />
  ),
}))

vi.mock("@vidstack/react", () => ({
  isHLSProvider: (provider: { type?: string } | null) =>
    provider?.type === "hls",
  MediaPlayer: ({
    children,
    dir,
    onLoadedMetadata,
    onProviderChange,
    src,
    style,
  }: {
    children: React.ReactNode
    dir: "ltr" | "rtl"
    onLoadedMetadata: () => void
    onProviderChange: (provider: unknown) => void
    src: { src: string }
    style: React.CSSProperties
  }) => {
    React.useEffect(() => {
      onProviderChange({
        type: "hls",
        video: { videoHeight: 880, videoWidth: 1280 },
      })
      onLoadedMetadata()

      return () => onProviderChange(null)
    }, [onLoadedMetadata, onProviderChange])

    return (
      <div
        data-testid="hls-player"
        data-aspect-ratio={style.aspectRatio}
        data-direction={dir}
        data-src={src.src}
      >
        {children}
      </div>
    )
  },
  MediaProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="media-provider">{children}</div>
  ),
  Track: ({
    src,
    label,
    language,
  }: {
    src: string
    label: string
    language: string
  }) => (
    <span
      data-testid="caption-track"
      data-src={src}
      data-label={label}
      data-language={language}
    />
  ),
}))

vi.mock("@vidstack/react/player/layouts/default", () => ({
  defaultLayoutIcons: {},
  DefaultVideoLayout: ({
    playbackRates,
    translations,
  }: {
    playbackRates: { min: number; max: number; step: number }
    translations: Record<string, string> | null
  }) => (
    <div
      data-testid="video-controls"
      data-minimum-rate={playbackRates.min}
      data-settings-label={translations?.Settings || "Settings"}
    />
  ),
}))

afterEach(() => {
  cleanup()
  localeState.locale = "en"
})

describe("VideoPlayer", () => {
  it("renders static HLS through Vidstack with external caption tracks", () => {
    render(
      <VideoPlayer
        title="Lesson"
        unit={unit({
          provider: "STATIC_HLS",
          playbackUrl: "https://video.example.test/lesson/v1/master.m3u8",
          captions: [
            {
              language: "en",
              label: "English",
              url: "https://video.example.test/lesson/v1/captions/en.vtt",
              defaultTrack: false,
            },
            {
              language: "ar",
              label: "العربية",
              url: "https://video.example.test/lesson/v1/captions/ar.vtt",
              defaultTrack: false,
            },
          ],
        })}
      />
    )

    expect(screen.getByTestId("hls-player").getAttribute("data-src")).toBe(
      "https://video.example.test/lesson/v1/master.m3u8"
    )
    expect(screen.getAllByTestId("caption-track")).toHaveLength(2)
    expect(
      screen.getByTestId("hls-player").getAttribute("data-aspect-ratio")
    ).toBe("1280 / 880")
    expect(
      screen.getByTestId("hls-player").getAttribute("data-direction")
    ).toBe("ltr")
    expect(
      screen.getByTestId("video-controls").getAttribute("data-minimum-rate")
    ).toBe("0.25")
    expect(screen.queryByTestId("mux-player")).toBeNull()
  })

  it("localizes the static HLS layout and caption labels in Arabic", () => {
    localeState.locale = "ar"

    render(
      <VideoPlayer
        title="الدرس"
        unit={unit({
          provider: "STATIC_HLS",
          playbackUrl: "https://video.example.test/lesson/v1/master.m3u8",
          captions: [
            {
              language: "en",
              label: "English",
              url: "https://video.example.test/lesson/v1/captions/en.vtt",
              defaultTrack: false,
            },
            {
              language: "ar",
              label: "Arabic",
              url: "https://video.example.test/lesson/v1/captions/ar.vtt",
              defaultTrack: false,
            },
          ],
        })}
      />
    )

    expect(
      screen.getByTestId("hls-player").getAttribute("data-direction")
    ).toBe("rtl")
    expect(
      screen.getByTestId("video-controls").getAttribute("data-settings-label")
    ).toBe("الإعدادات")
    expect(
      screen
        .getAllByTestId("caption-track")
        .map((track) => track.getAttribute("data-label"))
    ).toEqual(["الترجمة الإنجليزية", "الترجمة العربية"])
  })

  it("preserves the existing Mux player path", () => {
    render(
      <VideoPlayer
        title="Mux lesson"
        unit={unit({ provider: "MUX", playbackId: "mux-playback-1" })}
      />
    )

    expect(
      screen.getByTestId("mux-player").getAttribute("data-playback-id")
    ).toBe("mux-playback-1")
    expect(screen.queryByTestId("hls-player")).toBeNull()
  })
})

function unit(
  media: Partial<ContentUnit["media"]> & Pick<ContentUnit["media"], "provider">
): ContentUnit {
  return {
    id: "unit-1",
    slug: "lesson",
    position: 1,
    title: { en: "Lesson" },
    media: {
      id: "media-1",
      status: "READY",
      durationSeconds: 60,
      captions: [],
      ...media,
    },
  }
}
