import { beforeEach, describe, expect, it } from "vitest";
import {
    getGlobalQueryText,
    sanitizeQueryText,
    setGlobalQueryText
} from "../../lib/queryText";

describe("comparison query text", () => {
    beforeEach(() => {
        setGlobalQueryText("");
    });

    it("normalizes query text by trimming and collapsing whitespace", () => {
        expect(sanitizeQueryText("   neon    synth   wave   ")).toBe("neon synth wave");
    });

    it("removes unsupported control characters", () => {
        expect(sanitizeQueryText("vibe\u0000\u0007 check")).toBe("vibe check");
    });

    it("returns empty string for whitespace-only input", () => {
        expect(sanitizeQueryText(" \n\t ")).toBe("");
    });

    it("stores sanitized query text in global QUERY_TEXT", () => {
        const queryText = setGlobalQueryText("  dream   pop\u0000  ");

        expect(queryText).toBe("dream pop");
        expect(getGlobalQueryText()).toBe("dream pop");
    });
});
