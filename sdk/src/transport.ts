import type { ErrorEvent } from "./types.js";

export interface Transport {
    send(event: ErrorEvent): Promise<void>;
}


export class ConsoleTransport implements Transport {
    async send(event: ErrorEvent): Promise<void> {
        console.log("Sending event:", event);
    }
}

export class HttpTransport implements Transport {
    constructor(
        private readonly endpoint: string,
        private readonly apiKey: string
    ) { }

    async send(event: ErrorEvent): Promise<void> {
        await fetch(this.endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": this.apiKey
            },
            body: JSON.stringify(event)
        });
    }
}