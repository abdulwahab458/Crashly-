import type { ErrorTrackerConfig } from "./config.js";
import type { ErrorEvent } from "./types.js";
import { HttpTransport, type Transport } from "./transport.js";
import { registerBrowserErrorHandlers } from "./integrations/browser.js";

export class BrowserErrorTracker {
    private readonly transport: Transport;

    constructor(config: ErrorTrackerConfig) {
        this.transport =
            config.transport ??
            (config.endpoint
                ? new HttpTransport(config.endpoint, config.apiKey)
                : {
                    async send(event: ErrorEvent): Promise<void> {
                        console.log("Sending browser event:", event);
                    }
                });
    }

    captureException(error: Error): ErrorEvent {
        const event: ErrorEvent = {
            message: error.message,
            name: error.name,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };

        void this.transport.send(event).catch(() => { });

        return event;
    }

    init(): void {
        registerBrowserErrorHandlers(this);
    }
}