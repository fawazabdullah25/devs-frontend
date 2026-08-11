import * as React from "react"
import Autoplay from "embla-carousel-autoplay"

import { ContentCard } from "@/components/content-card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import type { CarouselApi } from "@/components/ui/carousel"
import { useLocale } from "@/lib/locale-context"
import type { LearningContent } from "@/types/content"

export function FeaturedRail({ items }: { items: LearningContent[] }) {
  const { direction } = useLocale()
  const [api, setApi] = React.useState<CarouselApi>()
  const autoplay = React.useRef(
    Autoplay({
      delay: 5000,
      playOnInit: false,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    })
  )

  React.useEffect(() => {
    if (!api) return

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const syncAutoplay = () => {
      if (reducedMotion.matches) autoplay.current.stop()
      else autoplay.current.play()
    }

    syncAutoplay()
    reducedMotion.addEventListener("change", syncAutoplay)
    return () => reducedMotion.removeEventListener("change", syncAutoplay)
  }, [api])

  if (items.length < 4) return null

  return (
    <Carousel
      opts={{ align: "start", direction, loop: true }}
      plugins={[autoplay.current]}
      setApi={setApi}
      className="px-0 md:px-12"
    >
      <CarouselContent>
        {items.map((item) => (
          <CarouselItem key={item.id} className="sm:basis-1/2 lg:basis-1/3">
            <ContentCard content={item} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="hidden md:inline-flex" />
      <CarouselNext className="hidden md:inline-flex" />
    </Carousel>
  )
}
