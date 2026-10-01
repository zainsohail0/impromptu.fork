import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";
import { apiContract } from "../contracts.js";
import type { LiveKitGateway } from "../topics/livekit.js";
import {
  createMemoryPublicLobbyRepository,
  type PublicLobbyRecord,
} from "./data.js";
import { createMemoryPrivateLobbyStore } from "./store.js";

const apps: Awaited<ReturnType<typeof buildApp>>[] = [];
const livekit: LiveKitGateway = {
  async issueToken() {
    return "token";
  },
  async listParticipants() {
    return [];
  },
};

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function testApp(publicLobbies: PublicLobbyRecord[]) {
  const app = await buildApp({
    publicLobbies: createMemoryPublicLobbyRepository(publicLobbies),
    privateLobbies: createMemoryPrivateLobbyStore(),
    livekit,
    livekitPublicUrl: "ws://localhost:7880",
    tokenTtlSeconds: 60,
  });
  apps.push(app);
  return app;
}

function publicLobby(
  overrides: Partial<Omit<PublicLobbyRecord, "visibility">> = {},
): PublicLobbyRecord {
  return {
    id: "lobby-1",
    question: "Should school start later?",
    initialTimeLimitSeconds: 300,
    rebuttalTimeLimitSeconds: 120,
    startTime: null,
    visibility: "public",
    spectatorLimit: 20,
    participantIds: [],
    status: "waiting",
    ...overrides,
  };
}

describe("GET /api/lobbies/public", () => {
  it("returns sorted public lobby summaries with counts and statuses", async () => {
    const app = await testApp([
      publicLobby({
        id: "z",
        question: "Zebras or horses?",
        participantIds: ["participant-one", "participant-two"],
        startTime: "2026-09-24T18:00:00.000Z",
        status: "active",
      }),
      publicLobby({ id: "a", question: "Apples or oranges?" }),
    ]);

    const response = await app.inject({
      method: "GET",
      url: apiContract.publicLobbies.path,
    });
    const summaries = apiContract.publicLobbies.response.parse(response.json());

    expect(response.statusCode).toBe(200);
    expect(summaries.map(({ id }) => id)).toEqual(["a", "z"]);
    expect(summaries[1]).toEqual(
      expect.objectContaining({
        participantCount: 2,
        status: "active",
        visibility: "public",
      }),
    );
  });

  it("returns an empty list when there are no public lobbies", async () => {
    const app = await testApp([]);
    const response = await app.inject({
      method: "GET",
      url: apiContract.publicLobbies.path,
    });

    expect(response.statusCode).toBe(200);
    expect(apiContract.publicLobbies.response.parse(response.json())).toEqual(
      [],
    );
  });
});
