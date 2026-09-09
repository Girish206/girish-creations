import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

// Replaces the old magnificPopup(".parent-container .gallery-popup") gallery
// lightbox. Pass the full list of image URLs for the gallery group and get
// back an `openAt(index)` handler plus the lightbox element to render once.
export function useImageLightbox(images: string[]) {
  const [index, setIndex] = useState(-1);

  function openAt(i: number) {
    setIndex(i);
  }

  // With a single image there's nothing to navigate to — hide the prev/
  // next arrows and counter the library shows by default even then.
  const isSingleImage = images.length <= 1;

  const lightbox = (
    <Lightbox
      open={index >= 0}
      close={() => setIndex(-1)}
      index={index}
      slides={images.map((src) => ({ src }))}
      render={
        isSingleImage
          ? { buttonPrev: () => null, buttonNext: () => null }
          : undefined
      }
    />
  );

  return { openAt, lightbox };
}
