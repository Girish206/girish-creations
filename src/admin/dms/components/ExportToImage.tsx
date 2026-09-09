import {
    handleDownloadImage,
    handleDownloadPdf,
} from "../utils/pdfExportUtils";
import { useState } from "react";
import Loader from "./Loader";
import CustomButton from "./CustomButton";

const ExportToImage = ({
    targetRef,
    fileName,
    pdf = true,
    image = true,
    title,
}: {
    targetRef: React.RefObject<HTMLElement | null>;
    fileName: string;
    pdf?: boolean;
    image?: boolean;
    title: string;
}) => {
    const [downloading, setDownloading] = useState(false);
    const downloadImage = async () => {
        console.log("inside");

        setDownloading(true);
        await handleDownloadImage(targetRef, fileName);
        setDownloading(false);
    };
    const downloadPdf = async () => {
        setDownloading(true);
        await handleDownloadPdf(targetRef, fileName, title);
        setDownloading(false);
    };

    return (
        <>
            {downloading && <Loader />}
            {image && (
                <CustomButton bg="custom-secondary" onClick={downloadImage}>
                    Download Image
                </CustomButton>
            )}
            {pdf && (
                <CustomButton bg="custom-primary" onClick={downloadPdf}>
                    <i className="fa-solid fa-file-pdf"></i> Download PDF
                </CustomButton>
            )}
        </>
    );
};

export default ExportToImage;
