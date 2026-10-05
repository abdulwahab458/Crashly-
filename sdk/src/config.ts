import type { Transport } from "./transport.js";

export interface ErrorTrackerConfig {
  apiKey: string;
  endpoint?: string;
  transport?: Transport;
}