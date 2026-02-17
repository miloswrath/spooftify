export type QUERY_TEXT = string;

declare global {
    interface Window {
        QUERY_TEXT: QUERY_TEXT;
    }
}

const EMPTY_QUERY_TEXT: QUERY_TEXT = "";
const UNSUPPORTED_CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F]/g;
const REPEATED_WHITESPACE = /\s+/g;

const ensureGlobalQueryText = (): void => {
    if (typeof window === "undefined") {
        return;
    }

    if (typeof window.QUERY_TEXT !== "string") {
        window.QUERY_TEXT = EMPTY_QUERY_TEXT;
    }
};

export const sanitizeQueryText = (queryText: QUERY_TEXT): QUERY_TEXT => {
    return queryText
        .replace(UNSUPPORTED_CONTROL_CHARACTERS, " ")
        .replace(REPEATED_WHITESPACE, " ")
        .trim();
};

export const setGlobalQueryText = (queryText: QUERY_TEXT): QUERY_TEXT => {
    const sanitizedQueryText = sanitizeQueryText(queryText);

    ensureGlobalQueryText();

    if (typeof window !== "undefined") {
        window.QUERY_TEXT = sanitizedQueryText;
    }

    return sanitizedQueryText;
};

export const getGlobalQueryText = (): QUERY_TEXT => {
    ensureGlobalQueryText();

    if (typeof window === "undefined") {
        return EMPTY_QUERY_TEXT;
    }

    return window.QUERY_TEXT;
};

ensureGlobalQueryText();
