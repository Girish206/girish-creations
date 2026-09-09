import type { ReactNode } from "react";
import * as ReactSlick from "react-slick";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa6";
import type { IconBaseProps } from "react-icons/lib";
import "slick-carousel/slick/slick.css";

// react-slick's CJS build double-wraps its default export: the module sets
// `exports.default = Slider` AND `exports.__esModule = true`, so Vite's dep
// pre-bundler emits `export default <that exports object>` — meaning the
// ESM default export is itself `{ __esModule: true, default: Slider }`, not
// the Slider component. A plain `import Slider from "react-slick"` (or even
// `import * as ns` then `ns.default`) only unwraps one level and still yields
// that wrapper object, crashing with "Element type is invalid: ...got: object".
// Unwrap the extra `.default` explicitly, with a fallback in case a future
// version of the package stops double-wrapping.
const ReactSlickDefault = ReactSlick.default as unknown as { default?: typeof ReactSlick.default };
const Slider = ReactSlickDefault.default ?? (ReactSlickDefault as unknown as typeof ReactSlick.default);

// react-slick clones prevArrow/nextArrow and injects extra props
// (currentSlide, slideCount, ...) meant for a component, not a plain DOM
// element — passing a bare <i> as prevArrow/nextArrow forwards those onto
// the DOM node and React warns ("does not recognize the `currentSlide`
// prop..."). Wrap in a real component that drops them before spreading.
type SlickArrowProps = IconBaseProps & { currentSlide?: number; slideCount?: number };

function PrevArrow({ currentSlide: _currentSlide, slideCount: _slideCount, ...rest }: SlickArrowProps) {
  return <FaArrowLeft {...rest} className="left icon" />;
}

function NextArrow({ currentSlide: _currentSlide, slideCount: _slideCount, ...rest }: SlickArrowProps) {
  return <FaArrowRight {...rest} className="right icon" />;
}

// Config ported 1:1 from static/assets/js/script.js's slick() calls for
// .client-feedback-slider / .article-publications-slider.
const SLICK_SETTINGS = {
  slidesToShow: 2,
  slidesToScroll: 1,
  autoplay: false,
  dots: false,
  infinite: true,
  arrows: true,
  speed: 500,
  prevArrow: <PrevArrow />,
  nextArrow: <NextArrow />,
  responsive: [
    {
      breakpoint: 768,
      settings: {
        slidesToShow: 1,
        slidesToScroll: 1,
      },
    },
  ],
};

export function Carousel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Slider className={className} {...SLICK_SETTINGS}>
      {children}
    </Slider>
  );
}
