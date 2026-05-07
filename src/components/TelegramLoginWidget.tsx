"use client";

import { useEffect, useRef } from "react";

interface Props {
  botName: string;
  onAuth: (user: any) => void;
  requestAccess?: string;
  buttonSize?: "large" | "medium" | "small";
}

export default function TelegramLoginWidget({
  botName,
  onAuth,
  requestAccess = "write",
  buttonSize = "large",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Define a global callback function for Telegram to call
    (window as any).onTelegramAuth = (user: any) => {
      onAuth(user);
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botName);
    script.setAttribute("data-size", buttonSize);
    script.setAttribute("data-request-access", requestAccess);
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.async = true;

    // Clear previous if any
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(script);
    }

    return () => {
      if (containerRef.current && script.parentNode) {
        try { containerRef.current.removeChild(script); } catch (e) {}
      }
      delete (window as any).onTelegramAuth;
    };
  }, [botName, onAuth, requestAccess, buttonSize]);

  return <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center' }}></div>;
}
