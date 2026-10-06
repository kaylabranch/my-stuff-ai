/** Error with an HTTP status and a user-safe message, thrown by AI providers. */
export class AiProviderError extends Error {
    constructor(
        message: string,
        readonly status: number,
    ) {
        super(message);
        this.name = 'AiProviderError';
    }
}

/** Maps an HTTP failure status to a user-facing message. */
export function describeAiHttpError(status: number, serverMessage?: string): string {
    if (/api key/i.test(serverMessage ?? '') || status === 401 || status === 403) {
        return 'The AI service rejected the API key. Check the API key in the server settings.';
    }
    switch (status) {
        case 400:
            return serverMessage || 'The image could not be processed. Try a different photo.';
        case 404:
            return 'The AI service was not found. Check the deployment includes the analyze function and the configured model name.';
        case 413:
            return 'That photo is too large to analyze. Try a smaller or lower-resolution image.';
        case 429:
            return 'The AI service is rate-limited or out of quota. Wait a minute and try again.';
        case 500:
            return serverMessage || 'The AI service is not configured correctly on the server.';
        case 502:
        case 503:
        case 504:
            return 'The AI service is busy or unreachable. Please try again shortly.';
        default:
            return `Image analysis failed (error ${status}). Please try again.`;
    }
}
