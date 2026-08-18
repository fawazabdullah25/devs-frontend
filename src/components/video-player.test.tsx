// @vitest-environment jsdom

import * as React from "react"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { VideoPlayer } from "@/components/video-player"
import type { ContentUnit } from "@/types/content"

vi.mock("@/lib/locale-context", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}))

vi.mock("@mux/mux-player-react", () => ({
  default: ({ playbackId }: { playbackId: string }) => (
    <div data-testid="mux-player" data-playback-id={playbackId} />
  ),
}))

vi.mock("@vidstack/react", () => ({
  isHLSProvider: () => false,
  MediaPlayer: ({
    children,
    src,
  }: {
    children: React.ReactNode
    src: { src: string }
  }) => (
    <div data-testid="hls-player" data-src={src.src}>
      {children}
    </div>
  ),
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
  DefaultVideoLayout: () => <div data-testid="video-controls" />,
}))

afterEach(cleanup)

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
    expect(screen.getByTestId("video-controls")).toBeTruthy()
    expect(screen.queryByTestId("mux-player")).toBeNull()
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
