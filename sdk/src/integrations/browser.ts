interface ErrorCapture {
  captureException(error: Error): unknown;
}

export function registerBrowserErrorHandlers(
  tracker: ErrorCapture
): void {
  window.addEventListener("error", (event) => {
    const error =
      event.error instanceof Error
        ? event.error
        : new Error(event.message || "Unknown browser error");

    tracker.captureException(error);
  });

  window.addEventListener("unhandledrejection", (event) => {
    const error =
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));

    tracker.captureException(error);
  });
}