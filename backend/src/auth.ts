const API_KEY = "test-api-key";

export function isValidApiKey(apiKey: unknown): boolean {
    return apiKey === API_KEY;
}