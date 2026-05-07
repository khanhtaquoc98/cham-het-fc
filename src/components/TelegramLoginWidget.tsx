"use client";

import { useEffect, useRef, useCallback } from "react";

interface Props {
  clientId: string;
  onAuth: (data: { id_token: string; user: any }) => void;
  requestAccess?: string;
}

export default function TelegramLoginWidget({
  clientId,
  onAuth,
  requestAccess = "write",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onAuthRef = useRef(onAuth);
  onAuthRef.current = onAuth;

  useEffect(() => {
    // 1. Load the official Telegram Login library
    const script = document.createElement("script");
    script.src = "https://oauth.telegram.org/js/telegram-login.js?3";
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      // 2. Init via the official JS API per docs
      if ((window as any).Telegram?.Login) {
        (window as any).Telegram.Login.init(
          {
            client_id: clientId,
            request_access: requestAccess,
            redirect_uri: window.location.origin + "/auth/callback",
          },
          (result: any) => {
            if (result.error) {
              console.error("[Telegram.Login] Error:", result.error);
              return;
            }
            onAuthRef.current(result);
          }
        );
      }
    };

    return () => {
      script.remove();
    };
  }, [clientId, requestAccess]);

  const handleClick = useCallback(() => {
    if ((window as any).Telegram?.Login) {
      (window as any).Telegram.Login.open();
    }
  }, []);

  return (
    <button
      type="button"
      className="tg-auth-button"
      onClick={handleClick}
      style={{ cursor: "pointer" }}
    >
      Sign In with Telegram
    </button>
  );
}
