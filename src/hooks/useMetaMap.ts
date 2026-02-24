import { useCallback, useEffect, useRef, useState } from "react";

const METAMAP_CLIENT_ID_FALLBACK = "698f38f51341681f7434fe61";
const CITIZEN_FLOW_ID_FALLBACK = "69946bb13a368b70899abadb";
const NON_CITIZEN_FLOW_ID_FALLBACK = "69946dc13f7daf14d956f954";

interface MetaMapConfig {
  clientId: string;
  flowId: string;
}

interface MetaMapResult {
  verificationId?: string;
  identityId?: string;
  sessionId?: string;
  status: "success" | "failed" | "cancelled";
  data?: any;
}

export const useMetaMap = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<MetaMapResult | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const autoCleanupIntervalRef = useRef<number | null>(null);
  const previousOverflowRef = useRef<{
    bodyOverflow: string;
    bodyPosition: string;
    htmlOverflow: string;
  } | null>(null);

  const cleanupMetaMapUI = useCallback(() => {
    if (autoCleanupIntervalRef.current) {
      window.clearInterval(autoCleanupIntervalRef.current);
      autoCleanupIntervalRef.current = null;
    }

    if (containerRef.current) {
      containerRef.current.remove();
      containerRef.current = null;
    }
    const existingContainer = document.getElementById("metamap-container");
    if (existingContainer) {
      existingContainer.remove();
    }

    try {
      const iframes = Array.from(document.querySelectorAll("iframe"));
      iframes.forEach((iframe) => {
        const src = iframe.getAttribute("src") || "";
        if (/metamap|getmati|mati/i.test(src)) {
          iframe.remove();
        }
      });

      const sdkNodes = Array.from(
        document.querySelectorAll(
          '[id*="mati"], [class*="mati"], [id*="metamap"], [class*="metamap"]'
        )
      );
      sdkNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        const cs = window.getComputedStyle(node);
        const looksLikeOverlay =
          (cs.position === "fixed" || cs.position === "absolute") &&
          (parseInt(cs.zIndex || "0", 10) >= 999 || cs.inset !== "auto");
        if (looksLikeOverlay) node.remove();
      });
    } catch (e) {
      console.warn("MetaMap cleanup: defensive DOM cleanup failed", e);
    }

    if (previousOverflowRef.current) {
      document.body.style.overflow = previousOverflowRef.current.bodyOverflow;
      document.body.style.position = previousOverflowRef.current.bodyPosition;
      document.documentElement.style.overflow = previousOverflowRef.current.htmlOverflow;
      previousOverflowRef.current = null;
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.documentElement.style.overflow = "";
    }
  }, []);

  useEffect(() => {
    if (document.querySelector('script[src="https://web-button.metamap.com/button.js"]')) {
      setIsSDKLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://web-button.metamap.com/button.js";
    script.async = true;
    script.onload = () => {
      setIsSDKLoaded(true);
    };
    script.onerror = () => {
      console.error("Failed to load MetaMap SDK");
      setError("Failed to load verification SDK");
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    const handleUserFinished = (event: Event) => {
      const customEvent = event as CustomEvent;
      const data = customEvent.detail || {};
      setLastResult({
        status: "success",
        verificationId: data.verificationId,
        identityId: data.identityId,
        sessionId: data.sessionId,
        data,
      });
      setIsLoading(false);
      cleanupMetaMapUI();
    };

    const handleUserExited = (event: Event) => {
      const customEvent = event as CustomEvent;
      const data = customEvent.detail || {};
      setLastResult({ status: "cancelled", data });
      setIsLoading(false);
      cleanupMetaMapUI();
    };

    const finishEvents = ["metamap:userFinishedSdk", "mati:userFinishedSdk"];
    const exitEvents = ["metamap:exitedSdk", "mati:exitedSdk"];

    finishEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleUserFinished);
      document.addEventListener(eventName, handleUserFinished);
    });

    exitEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleUserExited);
      document.addEventListener(eventName, handleUserExited);
    });

    return () => {
      finishEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserFinished);
        document.removeEventListener(eventName, handleUserFinished);
      });
      exitEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserExited);
        document.removeEventListener(eventName, handleUserExited);
      });
    };
  }, [cleanupMetaMapUI]);

  const getConfig = useCallback((documentType: "omang" | "passport"): MetaMapConfig => {
    const clientId = (import.meta.env.VITE_METAMAP_CLIENT_ID as string | undefined) ?? METAMAP_CLIENT_ID_FALLBACK;
    const citizenFlowId =
      (import.meta.env.VITE_METAMAP_CITIZEN_FLOW_ID as string | undefined) ?? CITIZEN_FLOW_ID_FALLBACK;
    const nonCitizenFlowId =
      (import.meta.env.VITE_METAMAP_NON_CITIZEN_FLOW_ID as string | undefined) ?? NON_CITIZEN_FLOW_ID_FALLBACK;
    const flowId = documentType === "omang" ? citizenFlowId : nonCitizenFlowId;
    return { clientId, flowId };
  }, []);

  const startVerification = useCallback(
    async (documentType: "omang" | "passport", metadata: Record<string, string> = {}): Promise<MetaMapResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const config = getConfig(documentType);
        const sessionId = crypto.randomUUID();

        if (!isSDKLoaded) {
          setIsLoading(false);
          setError("Verification SDK not ready");
          return { status: "failed", sessionId, data: { error: "SDK not loaded" } };
        }

        previousOverflowRef.current = {
          bodyOverflow: document.body.style.overflow,
          bodyPosition: document.body.style.position,
          htmlOverflow: document.documentElement.style.overflow,
        };

        const metadataObj = {
          ...metadata,
          documentType,
          sessionId,
        };
        const metadataStr = JSON.stringify(metadataObj);

        const container = document.createElement("div");
        container.id = "metamap-container";
        container.style.cssText =
          "position: fixed; top: -9999px; left: -9999px; opacity: 0; pointer-events: none;";
        containerRef.current = container;

        const metamapButton = document.createElement("metamap-button");
        metamapButton.setAttribute("clientId", config.clientId);
        metamapButton.setAttribute("flowId", config.flowId);
        metamapButton.setAttribute("nopersist", "true");
        metamapButton.setAttribute("color", "#22c55e");
        metamapButton.setAttribute("metadata", metadataStr);

        container.appendChild(metamapButton);
        document.body.appendChild(container);

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              try {
                const shadowButton = (metamapButton as any).shadowRoot?.querySelector("button");
                if (shadowButton) {
                  shadowButton.click();
                } else {
                  (metamapButton as HTMLElement).click();
                }
              } catch (e) {
                console.error("Failed to trigger MetaMap button", e);
              }
              resolve();
            });
          });
        });

        const startedAt = Date.now();
        if (autoCleanupIntervalRef.current) {
          window.clearInterval(autoCleanupIntervalRef.current);
        }
        autoCleanupIntervalRef.current = window.setInterval(() => {
          const maxMs = 10 * 60 * 1000;
          const elapsed = Date.now() - startedAt;
          if (elapsed > maxMs) {
            cleanupMetaMapUI();
            return;
          }

          const containerStillThere = Boolean(document.getElementById("metamap-container"));
          if (!containerStillThere) return;

          const sdkUiPresent = (() => {
            try {
              const overlayCandidates = Array.from(
                document.querySelectorAll('[id*="mati"], [class*="mati"], [id*="metamap"], [class*="metamap"]')
              )
                .filter((n) => n instanceof HTMLElement)
                .filter((n) => n.id !== "metamap-container" && !document.getElementById("metamap-container")?.contains(n)) as HTMLElement[];

              const overlayVisible = overlayCandidates.some((el) => {
                const cs = window.getComputedStyle(el);
                const z = parseInt(cs.zIndex || "0", 10);
                const isOverlayish =
                  (cs.position === "fixed" || cs.position === "absolute") &&
                  (z >= 999 || cs.inset !== "auto");
                const isVisible = cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0";
                return isOverlayish && isVisible;
              });
              if (overlayVisible) return true;

              return Array.from(document.querySelectorAll("iframe")).some((iframe) => {
                const src = iframe.getAttribute("src") || "";
                const title = iframe.getAttribute("title") || "";
                const aria = iframe.getAttribute("aria-label") || "";
                const name = iframe.getAttribute("name") || "";
                return /metamap|getmati|mati/i.test(src + " " + title + " " + aria + " " + name);
              });
            } catch {
              return false;
            }
          })();

          if (!sdkUiPresent) {
            cleanupMetaMapUI();
          }
        }, 800);

        setIsLoading(false);
        return { status: "success", sessionId };
      } catch (err) {
        console.error("Error starting MetaMap verification:", err);
        setIsLoading(false);
        setError("Failed to start verification");
        return { status: "failed", data: { error: err } };
      }
    },
    [cleanupMetaMapUI, getConfig, isSDKLoaded]
  );

  return {
    startVerification,
    cleanupMetaMapUI,
    isLoading,
    isSDKLoaded,
    error,
    lastResult,
    clearError: () => setError(null),
  };
};
