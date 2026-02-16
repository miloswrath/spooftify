import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createServer } from "./createServer";

describe("createServer", () => {
  const server = createServer({
    api1Client: {
      fetchPreviewTrack: vi.fn(async (seed: string) => ({ id: "t1", title: seed }))
    },
    api2Client: {
      fetchPair: vi.fn(async (vibe: string) => ({ left: `${vibe}-L`, right: `${vibe}-R` }))
    },
    llmClient: {
      summarizeVibe: vi.fn(async () => ({ vibe: "chill" }))
    }
  });

  it("returns health status", async () => {
    const response = await request(server).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it("returns api1 stubbed response", async () => {
    const response = await request(server).get("/api/api1/route?seed=focus");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: "t1", title: "focus" });
  });

  it("returns api2 stubbed response", async () => {
    const response = await request(server).get("/api/api2/route?vibe=lofi");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ left: "lofi-L", right: "lofi-R" });
  });

  it("blocks abusive llm input", async () => {
    const response = await request(server).post("/api/llm/route").send({ message: "I hate everyone" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("blocked_input");
  });

  it("accepts safe llm input", async () => {
    const response = await request(server)
      .post("/api/llm/route")
      .send({ message: "I want chill indie vibes" });

    expect(response.status).toBe(200);
    expect(response.body.vibe).toBe("chill");
  });
});