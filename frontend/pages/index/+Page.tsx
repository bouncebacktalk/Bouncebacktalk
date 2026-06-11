import { useEffect } from "react";
import { apiPost, rememberAccessToken } from "../../apps/api";

function Page() {
  useEffect(() => {
    // Auto-login so bets/scores load without manual sign-in
    apiPost<{ user: any; accessToken?: string }>("/auth/login", {
      email: "bouncebacktalk@gmail.com",
      password: "bbt2026",
    }, { skipAuthRefresh: true })
      .then((r) => {
        if (r.accessToken) rememberAccessToken(r.accessToken);
        window.location.replace("/history");
      })
      .catch(() => {
        // Already logged in or failed — just go to history
        window.location.replace("/history");
      });
  }, []);
  return null;
}

export { Page };
