import { useState, useEffect } from "react";

interface LoaderProps {
  text?: string;
}

const GOOD_MESSAGES = [
  "Loading excellence...",
  "Preparing your dashboard...",
  "Connecting you with your community...",
  "Gathering the latest updates...",
  "Setting things up for you...",
  "Optimizing your experience...",
  "Brewing some digital magic...",
  "Almost there...",
];

function Loader({ text }: LoaderProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % GOOD_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loader-overlay modern-loader">
      <div className="loader-content d-flex flex-column align-items-center justify-content-center">
        <div className="logo-container mb-4">
          <div className="logo-pulse"></div>
          <div className="logo-ring"></div>
          <img
            src="/logo/logo.png"
            alt="Logo"
            className="loader-logo"
          />
        </div>

        <div className="loader-text-wrapper text-center">
          <h4 className="loader-main-text mb-2">
            {text || "Processing"}
          </h4>
          <p className="loader-sub-text animate-flicker">
            {GOOD_MESSAGES[messageIndex]}
          </p>
        </div>

        <div className="loading-bar-container mt-4">
          <div className="loading-bar-progress"></div>
        </div>
      </div>
    </div>
  );
}

export default Loader;
