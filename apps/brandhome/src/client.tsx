import { StrictMode } from "react";
import { hydrateRoot, createRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";

const rootElement = document.getElementById("root");

if (rootElement && rootElement.hasChildNodes()) {
  hydrateRoot(
    rootElement,
    <StrictMode>
      <StartClient />
    </StrictMode>
  );
} else if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <StartClient />
    </StrictMode>
  );
} else {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>
  );
}
// code:4ce0
