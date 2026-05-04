"use client";

import { useEffect, useRef } from "react";

interface Props {
  botName?: string;
  clientId: string;
  onAuth: (user: any) => void;
  requestAccess?: "write" | "read";
}

export default function TelegramLoginWidget({
  clientId,
  onAuth,
  requestAccess = "write",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (window as any).onTelegramAuth = (user: any) => {
      onAuth(user);
    };

    const script = document.createElement("script");
    script.src = "https://oauth.telegram.org/js/telegram-login.js?3";
    script.setAttribute("data-client-id", clientId);
    script.setAttribute("data-request-access", requestAccess);
    script.setAttribute("data-onauth", "onTelegramAuth(data)");
    script.async = true;

    if (containerRef.current) {
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(script);

      // Add the button as per new docs
      const button = document.createElement("button");
      button.className = "tg-auth-button";
      button.style.background = "#2AABEE";
      button.style.color = "white";
      button.style.border = "none";
      button.style.padding = "12px 24px";
      button.style.borderRadius = "8px";
      button.style.fontSize = "16px";
      button.style.fontWeight = "bold";
      button.style.cursor = "pointer";
      button.style.display = "flex";
      button.style.alignItems = "center";
      button.style.gap = "8px";
      
      // Add telegram icon SVG
      button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0h-.056zm5.836 8.423l-1.95 9.176c-.146.653-.535.814-1.08.508l-2.986-2.202-1.44 1.385c-.16.16-.294.294-.602.294l.214-3.045 5.545-5.008c.241-.214-.053-.333-.374-.12L5.22 13.73l-2.952-.924c-.642-.202-.656-.642.134-.951l11.536-4.444c.535-.195 1.011.115.842.997z" fill="white"/>
        </svg>
        Sign In with Telegram
      `;
      
      containerRef.current.appendChild(button);
    }

    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, [clientId, onAuth, requestAccess]);

  return <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center' }} />;
}
