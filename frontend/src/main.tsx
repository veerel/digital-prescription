// Fonts are bundled (not loaded from Google): the CSP only allows same-origin
// fonts, and offline/LAN clinics have no internet.
import "@fontsource-variable/inter";
import "@fontsource-variable/lora";
import "@fontsource-variable/lora/wght-italic.css";
import "./styles/global.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";

import { AppProviders } from "@/app/providers";
import { createQueryClient } from "@/app/queryClient";
import { router } from "@/app/router";

const root = document.getElementById("root");
if (!root) throw new Error("#root element missing from index.html");

createRoot(root).render(
  <StrictMode>
    <AppProviders queryClient={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
