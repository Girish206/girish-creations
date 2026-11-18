import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ExpenseGroup, SettlementTransfer } from "../../../api/types";
import { BottomSheet } from "../../components/BottomSheet";
import CustomButton from "../../dms/components/CustomButton";
import { drawSplitCard, splitText } from "./splitCard";
import "./shareSplit.css";

// The split-up as a picture: a preview, then Share (the picture itself where
// the device can share files — phones — else the text), Download image, and
// Copy as text.
export function ShareSplitSheet({
  group,
  transfers,
  onClose,
}: {
  group: ExpenseGroup;
  transfers: SettlementTransfer[];
  onClose: () => void;
}) {
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const text = splitText(group, transfers);
  const fileName = `${group.name.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "split"}-split-up.png`;

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    drawSplitCard(group, transfers)
      .then((blob) => {
        if (cancelled) return;
        if (!blob) return setFailed(true);
        url = URL.createObjectURL(blob);
        setImage({ blob, url });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [group, transfers]);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Split-up copied");
    } catch {
      toast.error("Couldn't copy the split-up");
    }
  }

  function download() {
    if (!image) return;
    const link = document.createElement("a");
    link.href = image.url;
    link.download = fileName;
    link.click();
  }

  async function share() {
    const file = image && new File([image.blob], fileName, { type: "image/png" });
    try {
      if (file && navigator.canShare?.({ files: [file] })) {
        // No title with a picture: some apps (WhatsApp) then drop the text.
        await navigator.share({ files: [file], text: `${group.name} — split-up` });
      } else if (navigator.share) {
        await navigator.share({ title: `${group.name} — split-up`, text });
      } else {
        await copyText();
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") toast.error("Couldn't share the split-up");
    }
  }

  const canShare = typeof navigator.share === "function";

  return (
    <BottomSheet
      title="Share split-up"
      subtitle={group.name}
      icon={<i className="fa-solid fa-share-nodes" aria-hidden="true"></i>}
      onClose={onClose}
      footer={
        <>
          <CustomButton variant="outline" className="m-0" onClick={copyText}>
            <i className="fa-solid fa-copy" aria-hidden="true"></i> Copy text
          </CustomButton>
          <CustomButton variant={canShare ? "outline" : "normal"} className="m-0" onClick={download} disabled={!image}>
            <i className="fa-solid fa-download" aria-hidden="true"></i> Download
          </CustomButton>
          {canShare && (
            <CustomButton className="m-0" onClick={share} disabled={!image}>
              <i className="fa-solid fa-share-nodes" aria-hidden="true"></i> Share
            </CustomButton>
          )}
        </>
      }
    >
      <div className="split-share-preview">
        {image ? (
          <img src={image.url} alt={`${group.name} split-up`} />
        ) : (
          <p className="admin-settle-note m-0">{failed ? "Couldn't make the picture" : "Preparing picture…"}</p>
        )}
      </div>
    </BottomSheet>
  );
}
