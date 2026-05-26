'use client';

import * as React from 'react';
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

type CarouselApi = UseEmblaCarouselType[1];
type CarouselOptions = Parameters<typeof useEmblaCarousel>[0];

type CarouselContextValue = {
  carouselRef: UseEmblaCarouselType[0];
  api: CarouselApi;
  selectedIndex: number;
  slideCount: number;
  scrollPrev: (_event?: React.MouseEvent) => void;
  scrollNext: (_event?: React.MouseEvent) => void;
  scrollTo: (index: number) => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
  slideLabels: React.MutableRefObject<Map<number, string>>;
  registerSlideLabel: (index: number, label: string) => void;
  announcement: string;
};

const CarouselContext = React.createContext<CarouselContextValue | null>(null);

function useCarousel(): CarouselContextValue {
  const ctx = React.useContext(CarouselContext);
  if (!ctx) {
    throw new Error(
      'Carousel subcomponents must be rendered inside <Carousel>'
    );
  }
  return ctx;
}

const ANNOUNCE_DEBOUNCE_MS = 300;

interface CarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Embla options passed to `useEmblaCarousel`. */
  options?: CarouselOptions;
  /** Accessible label for the carousel region (D7). Defaults to "Carousel". */
  ariaLabel?: string;
}

/**
 * Headless 2+-slide carousel built on `embla-carousel-react`.
 *
 * Composition: wrap `<CarouselViewport>` with one `<CarouselSlide>` per slide,
 * optionally followed by `<CarouselPrev>`, `<CarouselNext>`, and `<CarouselDots>`.
 *
 * A11y: root region announces its role and label; slide changes are announced
 * through an off-screen `aria-live="polite"` region debounced ~300 ms so a
 * quick swipe doesn't double-announce. Arrow keys advance when the root
 * (or any descendant) has focus.
 *
 * @example
 * <Carousel ariaLabel="Comic preview">
 *   <CarouselViewport>
 *     <CarouselSlide label="Cover">{cover}</CarouselSlide>
 *     <CarouselSlide label="Composed page">{page}</CarouselSlide>
 *   </CarouselViewport>
 *   <CarouselPrev />
 *   <CarouselNext />
 *   <CarouselDots />
 * </Carousel>
 */
const Carousel = React.forwardRef<HTMLDivElement, CarouselProps>(
  (
    {
      options,
      ariaLabel = 'Carousel',
      className,
      children,
      onKeyDown: consumerOnKeyDown,
      ...props
    },
    ref
  ) => {
    const [emblaRef, emblaApi] = useEmblaCarousel({
      loop: false,
      ...options,
    });

    const [selectedIndex, setSelectedIndex] = React.useState(0);
    const [slideCount, setSlideCount] = React.useState(0);
    const [canScrollPrev, setCanScrollPrev] = React.useState(false);
    const [canScrollNext, setCanScrollNext] = React.useState(false);
    const [announcement, setAnnouncement] = React.useState('');
    const slideLabels = React.useRef<Map<number, string>>(new Map());

    const sync = React.useCallback((api: NonNullable<CarouselApi>) => {
      setSelectedIndex(api.selectedScrollSnap());
      setSlideCount(api.scrollSnapList().length);
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    }, []);

    React.useEffect(() => {
      if (!emblaApi) return;
      sync(emblaApi);
      emblaApi.on('select', sync);
      emblaApi.on('reInit', sync);
      return () => {
        emblaApi.off('select', sync);
        emblaApi.off('reInit', sync);
      };
    }, [emblaApi, sync]);

    // Debounced aria-live update; a rapid swipe through multiple slides only
    // announces the final settled slide, not each transient stop.
    React.useEffect(() => {
      if (!emblaApi) return;
      const handle = setTimeout(() => {
        const label =
          slideLabels.current.get(selectedIndex) ??
          `Slide ${selectedIndex + 1} of ${slideCount}`;
        setAnnouncement(label);
      }, ANNOUNCE_DEBOUNCE_MS);
      return () => clearTimeout(handle);
    }, [selectedIndex, slideCount, emblaApi]);

    const scrollPrev = React.useCallback(
      (_event?: React.MouseEvent) => emblaApi?.scrollPrev(),
      [emblaApi]
    );
    const scrollNext = React.useCallback(
      (_event?: React.MouseEvent) => emblaApi?.scrollNext(),
      [emblaApi]
    );
    const scrollTo = React.useCallback(
      (index: number) => emblaApi?.scrollTo(index),
      [emblaApi]
    );

    const registerSlideLabel = React.useCallback(
      (index: number, label: string) => {
        slideLabels.current.set(index, label);
      },
      []
    );

    const onKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          scrollPrev();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          scrollNext();
        }
      },
      [scrollPrev, scrollNext]
    );

    const contextValue = React.useMemo(
      () => ({
        carouselRef: emblaRef,
        api: emblaApi,
        selectedIndex,
        slideCount,
        scrollPrev,
        scrollNext,
        scrollTo,
        canScrollPrev,
        canScrollNext,
        slideLabels,
        registerSlideLabel,
        announcement,
      }),
      [
        emblaRef,
        emblaApi,
        selectedIndex,
        slideCount,
        scrollPrev,
        scrollNext,
        scrollTo,
        canScrollPrev,
        canScrollNext,
        registerSlideLabel,
        announcement,
      ]
    );

    const mergedOnKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown(e);
      consumerOnKeyDown?.(e);
    };

    return (
      <CarouselContext.Provider value={contextValue}>
        <div
          ref={ref}
          role="region"
          aria-roledescription="carousel"
          aria-label={ariaLabel}
          onKeyDown={mergedOnKeyDown}
          className={cn('relative outline-none', className)}
          {...props}
        >
          {children}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {announcement}
          </div>
        </div>
      </CarouselContext.Provider>
    );
  }
);
Carousel.displayName = 'Carousel';

/**
 * Embla viewport. Mounts the embla ref on its outer (overflow-hidden) element
 * and lays out its children as a horizontal flex track. Each direct child of
 * the inner track should be a `<CarouselSlide>`.
 */
const CarouselViewport = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { carouselRef } = useCarousel();
  return (
    <div ref={carouselRef} className="overflow-hidden">
      <div ref={ref} className={cn('flex', className)} {...props}>
        {children}
      </div>
    </div>
  );
});
CarouselViewport.displayName = 'CarouselViewport';

interface CarouselSlideProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Human-readable label used for `aria-label`, dots, and live announcements. */
  label?: string;
}

/**
 * A single slide. Pass a `label` so the slide is announced sensibly and the
 * dot indicator reads "Go to {label}".
 */
const CarouselSlide = React.forwardRef<HTMLDivElement, CarouselSlideProps>(
  ({ className, label, children, ...props }, ref) => {
    const { registerSlideLabel } = useCarousel();
    const elementRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
      if (!elementRef.current || !label) return;
      const parent = elementRef.current.parentElement;
      if (!parent) return;
      const index = Array.from(parent.children).indexOf(elementRef.current);
      if (index !== -1) registerSlideLabel(index, label);
    }, [label, registerSlideLabel]);

    return (
      <div
        ref={(node) => {
          elementRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref)
            (ref as React.MutableRefObject<HTMLDivElement | null>).current =
              node;
        }}
        role="group"
        aria-roledescription="slide"
        aria-label={label}
        className={cn('min-w-0 shrink-0 grow-0 basis-full', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CarouselSlide.displayName = 'CarouselSlide';

type CarouselNavButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

/** Previous-slide button. Disabled at the start of the carousel. */
const CarouselPrev = React.forwardRef<
  HTMLButtonElement,
  CarouselNavButtonProps
>(({ className, onClick: consumerOnClick, ...props }, ref) => {
  const { scrollPrev, canScrollPrev } = useCarousel();

  const composedOnClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    consumerOnClick?.(event);
    scrollPrev(event);
  };

  return (
    <button
      ref={ref}
      type="button"
      aria-label="Previous slide"
      onClick={composedOnClick}
      disabled={!canScrollPrev}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-slate-300 backdrop-blur transition hover:bg-slate-800 hover:text-white disabled:pointer-events-none disabled:opacity-40',
        className
      )}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
    </button>
  );
});
CarouselPrev.displayName = 'CarouselPrev';

/** Next-slide button. Disabled at the end of the carousel. */
const CarouselNext = React.forwardRef<
  HTMLButtonElement,
  CarouselNavButtonProps
>(({ className, onClick: consumerOnClick, ...props }, ref) => {
  const { scrollNext, canScrollNext } = useCarousel();

  const composedOnClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    consumerOnClick?.(event);
    scrollNext(event);
  };

  return (
    <button
      ref={ref}
      type="button"
      aria-label="Next slide"
      onClick={composedOnClick}
      disabled={!canScrollNext}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-slate-300 backdrop-blur transition hover:bg-slate-800 hover:text-white disabled:pointer-events-none disabled:opacity-40',
        className
      )}
      {...props}
    >
      <ChevronRight className="h-4 w-4" />
    </button>
  );
});
CarouselNext.displayName = 'CarouselNext';

type CarouselDotsProps = React.HTMLAttributes<HTMLDivElement>;

/** Dot indicators. Each dot reads `aria-current="true"` when its slide is active. */
const CarouselDots = React.forwardRef<HTMLDivElement, CarouselDotsProps>(
  ({ className, ...props }, ref) => {
    const { slideCount, selectedIndex, scrollTo, slideLabels } = useCarousel();
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-center gap-2', className)}
        {...props}
      >
        {Array.from({ length: slideCount }).map((_, i) => {
          const isActive = i === selectedIndex;
          const label = slideLabels.current.get(i) ?? `Slide ${i + 1}`;
          return (
            <button
              key={i}
              type="button"
              aria-label={`Go to ${label}`}
              aria-current={isActive ? 'true' : undefined}
              onClick={() => scrollTo(i)}
              className={cn(
                'h-2 rounded-full transition-all',
                isActive
                  ? 'w-6 bg-indigo-500'
                  : 'w-2 bg-slate-600 hover:bg-slate-500'
              )}
            />
          );
        })}
      </div>
    );
  }
);
CarouselDots.displayName = 'CarouselDots';

export {
  Carousel,
  CarouselViewport,
  CarouselSlide,
  CarouselPrev,
  CarouselNext,
  CarouselDots,
};
export type { CarouselApi, CarouselOptions };
