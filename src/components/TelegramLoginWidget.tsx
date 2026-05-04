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
    // Patch window.open to add origin parameter which Telegram OAuth requires
    const originalOpen = window.open;
    window.open = function(url, name, features) {
      if (typeof url === 'string' && url.includes('oauth.telegram.org/auth')) {
        url += '&origin=' + encodeURIComponent(window.location.origin);
      }
      return originalOpen(url, name, features);
    };

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
      button.innerText = "Sign In with Telegram";
      
      containerRef.current.appendChild(button);
    }

    return () => {
      delete (window as any).onTelegramAuth;
      window.open = originalOpen;
    };
  }, [clientId, onAuth, requestAccess]);

  return <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center' }} />;
}
