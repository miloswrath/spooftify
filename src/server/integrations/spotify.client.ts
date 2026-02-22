import type {
    ComparisonTrackCandidate,
    SpotifyClient,
    SpotifySearchParams
} from "../types";

const SPOTIFY_TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const SPOTIFY_SEARCH_ENDPOINT = "https://api.spotify.com/v1/search";

const isNonEmptyString = (value: unknown): value is string => {
    return typeof value === "string" && value.length > 0;
};

const getSpotifyClientCredentials = (): { clientId: string; clientSecret: string } => {
    const spotifyApiCredentials = process.env.SPOTIFY_API;
    const [clientIdFromApi, clientSecretFromApi] =
        spotifyApiCredentials?.split(":", 2) ?? [];

    const clientId = process.env.SPOTIFY_CLIENT_ID ?? clientIdFromApi;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET ?? clientSecretFromApi;

    if (!isNonEmptyString(clientId) || !isNonEmptyString(clientSecret)) {
        throw new Error("missing_spotify_credentials");
    }

    return { clientId, clientSecret };
};

const getAccessToken = async (): Promise<string> => {
    const { clientId, clientSecret } = getSpotifyClientCredentials();
    const encodedCredentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    let response: Response;

    try {
        response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
            method: "POST",
            headers: {
                Authorization: `Basic ${encodedCredentials}`,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: "grant_type=client_credentials"
        });
    } catch {
        throw new Error("spotify_network_error");
    }

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            throw new Error("spotify_auth_failed");
        }

        if (response.status === 429) {
            throw new Error("spotify_rate_limited");
        }

        throw new Error("spotify_token_request_failed");
    }

    const payload = (await response.json()) as { access_token?: unknown };

    if (!isNonEmptyString(payload.access_token)) {
        throw new Error("spotify_token_missing");
    }

    return payload.access_token;
};

const mapSpotifySearchItem = (item: unknown): ComparisonTrackCandidate | null => {
    if (!item || typeof item !== "object") {
        return null;
    }

    const candidate = item as {
        id?: unknown;
        name?: unknown;
        uri?: unknown;
        artists?: Array<{ name?: unknown }>;
    };

    if (
        !isNonEmptyString(candidate.id) ||
        !isNonEmptyString(candidate.name) ||
        !isNonEmptyString(candidate.uri)
    ) {
        return null;
    }

    const artistNames = Array.isArray(candidate.artists)
        ? candidate.artists
            .map((artist) => artist?.name)
            .filter((name): name is string => isNonEmptyString(name))
        : [];

    return {
        id: candidate.id,
        title: candidate.name,
        artistNames,
        uri: candidate.uri
    };
};

export function createSpotifyClient(): SpotifyClient {
    return {
        async searchTracks(params: SpotifySearchParams) {
            const accessToken = await getAccessToken();

            const searchParams = new URLSearchParams({
                q: params.q,
                type: params.type,
                limit: String(params.limit),
                offset: String(params.offset)
            });

            let response: Response;

            try {
                response = await fetch(`${SPOTIFY_SEARCH_ENDPOINT}?${searchParams.toString()}`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });
            } catch {
                throw new Error("spotify_network_error");
            }

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error("spotify_auth_failed");
                }

                if (response.status === 429) {
                    throw new Error("spotify_rate_limited");
                }

                throw new Error("spotify_search_request_failed");
            }

            const payload = (await response.json()) as {
                tracks?: { items?: unknown[] };
            };

            const items = Array.isArray(payload.tracks?.items)
                ? payload.tracks.items
                : [];

            return items
                .map((item) => mapSpotifySearchItem(item))
                .filter((item): item is ComparisonTrackCandidate => item !== null);
        }
    };
}
