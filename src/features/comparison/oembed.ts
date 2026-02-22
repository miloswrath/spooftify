const SPOTIFY_OEMBED_ENDPOINT = "https://open.spotify.com/oembed";

const isNonEmptyString = (value: unknown): value is string => {
    return typeof value === "string" && value.trim().length > 0;
};

const getTrackIdFromUri = (uri: string): string | null => {
    const match = /^spotify:track:([A-Za-z0-9]+)$/.exec(uri.trim());

    return match?.[1] ?? null;
};

const buildSpotifyTrackUrl = (uri: string): string | null => {
    const trackId = getTrackIdFromUri(uri);

    return trackId ? `https://open.spotify.com/track/${encodeURIComponent(trackId)}` : null;
};

const getEmbedSrcFromHtml = (html: string): string | null => {
    const srcMatch = /src="([^"]+)"/.exec(html);

    return srcMatch?.[1] ?? null;
};

export const resolveSpotifyEmbedUrl = async (uri: string): Promise<string> => {
    const trackUrl = buildSpotifyTrackUrl(uri);

    if (!trackUrl) {
        throw new Error("invalid_spotify_uri");
    }

    let response: Response;

    try {
        response = await fetch(
            `${SPOTIFY_OEMBED_ENDPOINT}?${new URLSearchParams({ url: trackUrl }).toString()}`
        );
    } catch {
        throw new Error("oembed_network_error");
    }

    if (!response.ok) {
        throw new Error("oembed_request_failed");
    }

    const payload = (await response.json()) as {
        iframe_url?: unknown;
        html?: unknown;
    };

    if (isNonEmptyString(payload.iframe_url)) {
        return payload.iframe_url;
    }

    if (isNonEmptyString(payload.html)) {
        const embedSrc = getEmbedSrcFromHtml(payload.html);

        if (embedSrc) {
            return embedSrc;
        }
    }

    throw new Error("oembed_response_invalid");
};
