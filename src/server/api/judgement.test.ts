import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { ComparisonRoundChoice } from "../../features/comparison/types.js";
import type { ChatMessage } from "../../features/judgement/types.js";
import { createServer } from "../createServer.js";
import type { Api1Client, Api2Client, LlmClient, SpotifyClient } from "../types.js";

describe("POST /api/judgement/route", () => {
  // Mock clients
  const mockApi1Client: Api1Client = {
    fetchPreviewTrack: vi.fn()
  };

  const mockApi2Client: Api2Client = {
    fetchPair: vi.fn()
  };

  const mockSpotifyClient: SpotifyClient = {
    searchTracks: vi.fn()
  };

  const createMockLlmClient = () => ({
    summarizeVibe: vi.fn(),
    generateQueryText: vi.fn(),
    generateJudgement: vi.fn()
  });

  describe("Successful judgement generation", () => {
    it("should generate judgement with valid input", async () => {
      const mockLlmClient = createMockLlmClient() as LlmClient;
      const expectedJudgement =
        "Your taste is all over the place, in the best way possible. You've got the energy of someone who listens to everything from lo-fi beats to death metal, and somehow it works. Honestly, respect the chaos.";

      mockLlmClient.generateJudgement = vi
        .fn()
        .mockResolvedValueOnce({ judgement: expectedJudgement });

      const app = createServer({
        api1Client: mockApi1Client,
        api2Client: mockApi2Client,
        spotifyClient: mockSpotifyClient,
        llmClient: mockLlmClient
      });

      const chatMessages: ChatMessage[] = [
        { id: "1", role: "user", content: "I like things that are chaotic" },
        { id: "2", role: "assistant", content: "Got it, chaotic vibe" }
      ];

      const comparisonChoices: ComparisonRoundChoice[] = [
        {
          roundIndex: 1,
          leftTrackId: "track-1",
          rightTrackId: "track-2",
          chosenTrackId: "track-1"
        },
        {
          roundIndex: 2,
          leftTrackId: "track-3",
          rightTrackId: "track-4",
          chosenTrackId: "track-4"
        }
      ];

      const vibeCategories = ["chaotic", "energetic"];

      const response = await request(app)
        .post("/api/judgement/route")
        .send({
          chatMessages,
          comparisonChoices,
          vibeCategories
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ judgement: expectedJudgement });
      expect(mockLlmClient.generateJudgement).toHaveBeenCalledOnce();
    });

    it("should handle empty vibe categories", async () => {
      const mockLlmClient = createMockLlmClient() as LlmClient;
      const expectedJudgement = "You seem like a thoughtful listener with diverse taste.";

      mockLlmClient.generateJudgement = vi
        .fn()
        .mockResolvedValueOnce({ judgement: expectedJudgement });

      const app = createServer({
        api1Client: mockApi1Client,
        api2Client: mockApi2Client,
        spotifyClient: mockSpotifyClient,
        llmClient: mockLlmClient
      });

      const chatMessages: ChatMessage[] = [
        { id: "1", role: "user", content: "Just surprise me" }
      ];

      const comparisonChoices: ComparisonRoundChoice[] = [];

      const response = await request(app)
        .post("/api/judgement/route")
        .send({
          chatMessages,
          comparisonChoices,
          vibeCategories: []
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ judgement: expectedJudgement });
    });
  });

  describe("Abuse guard blocking", () => {
    it("should block harmful vibe categories", async () => {
      const mockLlmClient = createMockLlmClient() as LlmClient;

      const app = createServer({
        api1Client: mockApi1Client,
        api2Client: mockApi2Client,
        spotifyClient: mockSpotifyClient,
        llmClient: mockLlmClient
      });

      const chatMessages: ChatMessage[] = [
        { id: "1", role: "user", content: "I like peaceful music" }
      ];

      const comparisonChoices: ComparisonRoundChoice[] = [];

      // "peace" is in the blocklist
      const response = await request(app)
        .post("/api/judgement/route")
        .send({
          chatMessages,
          comparisonChoices,
          vibeCategories: ["peace", "love"]
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        code: "blocked_input",
        message: "Request contains blocked content"
      });
      expect(mockLlmClient.generateJudgement).not.toHaveBeenCalled();
    });

    it("should block harmful user messages", async () => {
      const mockLlmClient = createMockLlmClient() as LlmClient;

      const app = createServer({
        api1Client: mockApi1Client,
        api2Client: mockApi2Client,
        spotifyClient: mockSpotifyClient,
        llmClient: mockLlmClient
      });

      const chatMessages: ChatMessage[] = [
        { id: "1", role: "user", content: "I like happiness" }
      ];

      const comparisonChoices: ComparisonRoundChoice[] = [];

      // "happiness" is in the blocklist
      const response = await request(app)
        .post("/api/judgement/route")
        .send({
          chatMessages,
          comparisonChoices,
          vibeCategories: []
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        code: "blocked_input",
        message: "Request contains blocked content"
      });
      expect(mockLlmClient.generateJudgement).not.toHaveBeenCalled();
    });
  });

  describe("LLM error handling", () => {
    it("should handle timeout errors gracefully", async () => {
      const mockLlmClient = createMockLlmClient() as LlmClient;
      mockLlmClient.generateJudgement = vi.fn().mockRejectedValueOnce(new Error("timeout"));

      const app = createServer({
        api1Client: mockApi1Client,
        api2Client: mockApi2Client,
        spotifyClient: mockSpotifyClient,
        llmClient: mockLlmClient
      });

      const chatMessages: ChatMessage[] = [
        { id: "1", role: "user", content: "test" }
      ];

      const response = await request(app)
        .post("/api/judgement/route")
        .send({
          chatMessages,
          comparisonChoices: [],
          vibeCategories: []
        });

      expect(response.status).toBe(503);
      expect(response.body.code).toBe("llm_error");
      expect(response.body.message).toContain("timed out");
    });

    it("should handle network errors gracefully", async () => {
      const mockLlmClient = createMockLlmClient() as LlmClient;
      mockLlmClient.generateJudgement = vi
        .fn()
        .mockRejectedValueOnce(new Error("network_error"));

      const app = createServer({
        api1Client: mockApi1Client,
        api2Client: mockApi2Client,
        spotifyClient: mockSpotifyClient,
        llmClient: mockLlmClient
      });

      const chatMessages: ChatMessage[] = [
        { id: "1", role: "user", content: "test" }
      ];

      const response = await request(app)
        .post("/api/judgement/route")
        .send({
          chatMessages,
          comparisonChoices: [],
          vibeCategories: []
        });

      expect(response.status).toBe(503);
      expect(response.body.code).toBe("llm_error");
      expect(response.body.message).toContain("Network error");
    });

    it("should handle empty LLM output", async () => {
      const mockLlmClient = createMockLlmClient() as LlmClient;
      mockLlmClient.generateJudgement = vi
        .fn()
        .mockRejectedValueOnce(new Error("empty_output"));

      const app = createServer({
        api1Client: mockApi1Client,
        api2Client: mockApi2Client,
        spotifyClient: mockSpotifyClient,
        llmClient: mockLlmClient
      });

      const chatMessages: ChatMessage[] = [
        { id: "1", role: "user", content: "test" }
      ];

      const response = await request(app)
        .post("/api/judgement/route")
        .send({
          chatMessages,
          comparisonChoices: [],
          vibeCategories: []
        });

      expect(response.status).toBe(503);
      expect(response.body.code).toBe("invalid_response");
      expect(response.body.message).toContain("empty");
    });

    it("should handle invalid response from LLM", async () => {
      const mockLlmClient = createMockLlmClient() as LlmClient;
      mockLlmClient.generateJudgement = vi
        .fn()
        .mockRejectedValueOnce(new Error("invalid_response_body"));

      const app = createServer({
        api1Client: mockApi1Client,
        api2Client: mockApi2Client,
        spotifyClient: mockSpotifyClient,
        llmClient: mockLlmClient
      });

      const chatMessages: ChatMessage[] = [
        { id: "1", role: "user", content: "test" }
      ];

      const response = await request(app)
        .post("/api/judgement/route")
        .send({
          chatMessages,
          comparisonChoices: [],
          vibeCategories: []
        });

      expect(response.status).toBe(503);
      expect(response.body.code).toBe("invalid_response");
    });
  });

  describe("Request validation", () => {
    it("should reject requests with missing chatMessages", async () => {
      const mockLlmClient = createMockLlmClient() as LlmClient;

      const app = createServer({
        api1Client: mockApi1Client,
        api2Client: mockApi2Client,
        spotifyClient: mockSpotifyClient,
        llmClient: mockLlmClient
      });

      const response = await request(app)
        .post("/api/judgement/route")
        .send({
          comparisonChoices: [],
          vibeCategories: []
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("llm_error");
      expect(response.body.message).toContain("Invalid request body");
    });

    it("should reject requests with missing comparisonChoices", async () => {
      const mockLlmClient = createMockLlmClient() as LlmClient;

      const app = createServer({
        api1Client: mockApi1Client,
        api2Client: mockApi2Client,
        spotifyClient: mockSpotifyClient,
        llmClient: mockLlmClient
      });

      const response = await request(app)
        .post("/api/judgement/route")
        .send({
          chatMessages: [],
          vibeCategories: []
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("llm_error");
    });

    it("should reject requests with missing vibeCategories", async () => {
      const mockLlmClient = createMockLlmClient() as LlmClient;

      const app = createServer({
        api1Client: mockApi1Client,
        api2Client: mockApi2Client,
        spotifyClient: mockSpotifyClient,
        llmClient: mockLlmClient
      });

      const response = await request(app)
        .post("/api/judgement/route")
        .send({
          chatMessages: [],
          comparisonChoices: []
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("llm_error");
    });

    it("returns 404 for unmapped HTTP methods", async () => {
      const mockLlmClient = createMockLlmClient() as LlmClient;

      const app = createServer({
        api1Client: mockApi1Client,
        api2Client: mockApi2Client,
        spotifyClient: mockSpotifyClient,
        llmClient: mockLlmClient
      });

      const response = await request(app)
        .get("/api/judgement/route");

      expect(response.status).toBe(404);
    });
  });
});
