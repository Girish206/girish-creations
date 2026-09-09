// utils/pdfExportUtils.ts
import jsPDF from "jspdf";
// @ts-ignore
import domtoimage from "dom-to-image-more";

const handleDownloadPdf = async (
  targetRef: any,
  fileName: string,
  title: string
) => {
  const dataUrl = await generatePngDataUrl(targetRef);
  if (!dataUrl) return;

  const pdf = new jsPDF("p", "mm", "a4");

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;

  const titleFontSize = 14;
  const lineHeight = 7;

  const usableWidth = pdfWidth - 2 * margin;
  const bottomMargin = margin;

  const titleLines = pdf.splitTextToSize(title, usableWidth);
  const titleHeight = titleLines.length * lineHeight;
  const spacingAfterTitle = 5;

  const topOffset = margin + titleHeight + spacingAfterTitle;
  const usableHeight = pdfHeight - topOffset - bottomMargin;

  const image = new Image();
  image.src = dataUrl;

  image.onload = () => {
    const imageWidth = image.width;
    const imageHeight = image.height;

    const widthScale = usableWidth / imageWidth;
    const heightScale = usableHeight / imageHeight;
    const scale = Math.min(widthScale, heightScale);

    const finalWidth = imageWidth * scale;
    const finalHeight = imageHeight * scale;

    // Center the image horizontally
    const x = (pdfWidth - finalWidth) / 2;
    const y = topOffset;

    // Add wrapped and centered title
    pdf.setFontSize(titleFontSize);
    pdf.setFont("helvetica", "bold");

    let currentY = margin;
    titleLines.forEach((line: any) => {
      pdf.text(line, pdfWidth / 2, currentY, { align: "center" });
      currentY += lineHeight;
    });

    // Add the image scaled down to fit
    pdf.addImage(
      dataUrl,
      "JPEG",
      x,
      y,
      finalWidth,
      finalHeight,
      undefined,
      "FAST"
    );

    pdf.save(`${fileName}.pdf`);
  };
};

const handleDownloadImage = async (targetRef: any, fileName: string) => {
  const dataUrl = await generatePngDataUrl(targetRef);
  if (!dataUrl) return;

  const link = document.createElement("a");
  link.download = `${fileName}.png`;
  link.href = dataUrl;
  link.click();
};

const generatePngDataUrl = async (targetRef: any) => {
  const element = targetRef.current;
  if (!element) return null;

  // Backup styles
  const originalStyle = {
    width: element.style.width,
    height: element.style.height,
    overflow: element.style.overflow,
    maxWidth: element.style.maxWidth,
    maxHeight: element.style.maxHeight,
  };

  try {
    // Temporarily expand styles
    element.style.width = "fit-content";
    element.style.height = "auto";
    element.style.overflow = "visible";
    element.style.maxWidth = "none";
    element.style.maxHeight = "none";

    // Expand nested scroll wrappers
    element
      .querySelectorAll(".table-responsive, .scrollable, .overflow-auto")
      .forEach((wrapper: HTMLElement) => {
        wrapper.style.overflow = "visible";
        wrapper.style.height = "auto";
        wrapper.style.maxHeight = "none";
        wrapper.style.width = "fit-content";
      });

    // Ensure tables are not clipped
    element.querySelectorAll("table").forEach((el: HTMLElement) => {
      el.style.tableLayout = "auto";
    });

    // Spacer to avoid clipping
    const padDiv = document.createElement("div");
    padDiv.style.height = "100px";
    padDiv.style.visibility = "hidden";
    padDiv.style.pointerEvents = "none";
    padDiv.className = "download-padding-spacer";
    element.appendChild(padDiv);

    // Layout settle
    await new Promise((res) =>
      requestAnimationFrame(() => setTimeout(res, 500))
    );

    // More accurate size measurement
    const rect = element.getBoundingClientRect();
    const scale = 2; // For retina
    const fullWidth = Math.ceil(rect.width);
    const fullHeight = Math.ceil(rect.height);

    // Generate image
    const dataUrl = await domtoimage.toPng(element, {
      cacheBust: true,
      backgroundColor: "#ffffff",
      style: {
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      },
      width: fullWidth * scale,
      height: fullHeight * scale,
    } as any);

    return dataUrl;
  } catch (err) {
    console.error("Image generation failed", err);
    return null;
  } finally {
    // Restore main element
    Object.assign(element.style, originalStyle);

    // Restore children
    element
      .querySelectorAll(".table-responsive, .scrollable, .overflow-auto")
      .forEach((wrapper: HTMLElement) => {
        wrapper.style.overflow = "";
        wrapper.style.height = "";
        wrapper.style.maxHeight = "";
        wrapper.style.width = "";
      });
    element.querySelectorAll("table").forEach((el: HTMLElement) => {
      el.style.tableLayout = "";
    });

    // Remove spacer
    const pad = element.querySelector(".download-padding-spacer");
    if (pad) pad.remove();
  }
};

export { generatePngDataUrl, handleDownloadImage, handleDownloadPdf };
