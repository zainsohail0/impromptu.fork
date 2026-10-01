import { describe, expect, it } from "vitest";

import {
  lobbyParticipantSchema,
  positionChangeBodySchema,
  positionChangeErrorSchema,
  positionChangeResultSchema,
  type LobbyParticipant,
} from "./contract.js";
import {
  createMemoryPositionRepository,
  type LobbyPositionState,
} from "./positions.js";

const spectator = (id: string): LobbyParticipant => ({
  id,
  role: "spectator",
  sideIndex: null,
});

const debater = (id: string, sideIndex: 0 | 1): LobbyParticipant => ({
  id,
  role: "debater",
  sideIndex,
});

function waitingLobby(
  participants: LobbyParticipant[],
  overrides: Partial<LobbyPositionState> = {},
): LobbyPositionState {
  return {
    id: "lobby-1",
    status: "waiting",
    participants,
    ...overrides,
  };
}

describe("lobby position changes", () => {
  it("allows a spectator to claim either available position", async () => {
    const repository = createMemoryPositionRepository([
      waitingLobby([spectator("first"), spectator("second")]),
    ]);

    await expect(
      repository.changePosition({
        lobbyId: "lobby-1",
        participantId: "first",
        input: { sideIndex: 0 },
      }),
    ).resolves.toEqual({
      ok: true,
      value: { participant: debater("first", 0) },
    });
    await expect(
      repository.changePosition({
        lobbyId: "lobby-1",
        participantId: "second",
        input: { sideIndex: 1 },
      }),
    ).resolves.toEqual({
      ok: true,
      value: { participant: debater("second", 1) },
    });
  });

  it("lets a debater release a position for another spectator", async () => {
    const repository = createMemoryPositionRepository([
      waitingLobby([debater("first", 0), spectator("second")]),
    ]);

    await expect(
      repository.changePosition({
        lobbyId: "lobby-1",
        participantId: "first",
        input: { sideIndex: null },
      }),
    ).resolves.toEqual({
      ok: true,
      value: { participant: spectator("first") },
    });
    await expect(
      repository.changePosition({
        lobbyId: "lobby-1",
        participantId: "second",
        input: { sideIndex: 0 },
      }),
    ).resolves.toEqual({
      ok: true,
      value: { participant: debater("second", 0) },
    });
  });

  it("rejects a third debater when both positions are occupied", async () => {
    const repository = createMemoryPositionRepository([
      waitingLobby([
        debater("first", 0),
        debater("second", 1),
        spectator("third"),
      ]),
    ]);

    await expect(
      repository.changePosition({
        lobbyId: "lobby-1",
        participantId: "third",
        input: { sideIndex: 1 },
      }),
    ).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ code: "POSITION_UNAVAILABLE" }),
    });
    expect(repository.getLobby("lobby-1")?.participants).toContainEqual(
      spectator("third"),
    );
  });

  it("rejects changes after the round starts", async () => {
    const repository = createMemoryPositionRepository([
      waitingLobby([spectator("first")], { status: "active" }),
    ]);

    await expect(
      repository.changePosition({
        lobbyId: "lobby-1",
        participantId: "first",
        input: { sideIndex: 0 },
      }),
    ).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ code: "ROUND_ALREADY_STARTED" }),
    });
  });

  it("rejects unknown lobbies and nonparticipants", async () => {
    const repository = createMemoryPositionRepository([
      waitingLobby([spectator("member")]),
    ]);

    await expect(
      repository.changePosition({
        lobbyId: "missing",
        participantId: "member",
        input: { sideIndex: 0 },
      }),
    ).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ code: "LOBBY_NOT_FOUND" }),
    });
    await expect(
      repository.changePosition({
        lobbyId: "lobby-1",
        participantId: "stranger",
        input: { sideIndex: 0 },
      }),
    ).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ code: "NOT_A_PARTICIPANT" }),
    });
  });

  it("treats claiming the same position again as an idempotent success", async () => {
    const repository = createMemoryPositionRepository([
      waitingLobby([debater("first", 0)]),
    ]);

    await expect(
      repository.changePosition({
        lobbyId: "lobby-1",
        participantId: "first",
        input: { sideIndex: 0 },
      }),
    ).resolves.toEqual({
      ok: true,
      value: { participant: debater("first", 0) },
    });
  });

  it("allows exactly one of two simultaneous claims for the same position", async () => {
    const repository = createMemoryPositionRepository([
      waitingLobby([spectator("first"), spectator("second")]),
    ]);

    const results = await Promise.all([
      repository.changePosition({
        lobbyId: "lobby-1",
        participantId: "first",
        input: { sideIndex: 0 },
      }),
      repository.changePosition({
        lobbyId: "lobby-1",
        participantId: "second",
        input: { sideIndex: 0 },
      }),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual([
      {
        ok: false,
        error: expect.objectContaining({ code: "POSITION_UNAVAILABLE" }),
      },
    ]);
    expect(
      repository
        .getLobby("lobby-1")
        ?.participants.filter((participant) => participant.role === "debater"),
    ).toHaveLength(1);
  });

  it("allows a debater to move directly to an available position", async () => {
    const repository = createMemoryPositionRepository([
      waitingLobby([debater("first", 0), spectator("second")]),
    ]);

    await expect(
      repository.changePosition({
        lobbyId: "lobby-1",
        participantId: "first",
        input: { sideIndex: 1 },
      }),
    ).resolves.toEqual({
      ok: true,
      value: { participant: debater("first", 1) },
    });
    expect(repository.getLobby("lobby-1")?.participants).toContainEqual(
      debater("first", 1),
    );
  });

  it("treats repeatedly releasing a position as an idempotent success", async () => {
    const repository = createMemoryPositionRepository([
      waitingLobby([spectator("first")]),
    ]);

    const release = () =>
      repository.changePosition({
        lobbyId: "lobby-1",
        participantId: "first",
        input: { sideIndex: null },
      });

    await expect(release()).resolves.toEqual({
      ok: true,
      value: { participant: spectator("first") },
    });
    await expect(release()).resolves.toEqual({
      ok: true,
      value: { participant: spectator("first") },
    });
  });

  it("leaves lobby state unchanged after a rejected claim", async () => {
    const repository = createMemoryPositionRepository([
      waitingLobby([debater("first", 0), spectator("second")]),
    ]);
    const before = repository.getLobby("lobby-1");

    await repository.changePosition({
      lobbyId: "lobby-1",
      participantId: "second",
      input: { sideIndex: 0 },
    });

    expect(repository.getLobby("lobby-1")).toEqual(before);
  });

  it("returns copies that cannot mutate repository state", async () => {
    const repository = createMemoryPositionRepository([
      waitingLobby([spectator("first")]),
    ]);
    const snapshot = repository.getLobby("lobby-1");
    snapshot?.participants.push(spectator("injected"));

    const result = await repository.changePosition({
      lobbyId: "lobby-1",
      participantId: "first",
      input: { sideIndex: 0 },
    });
    if (result.ok) result.value.participant.id = "changed";

    expect(repository.getLobby("lobby-1")?.participants).toEqual([
      debater("first", 0),
    ]);
  });
});

describe("position change contracts", () => {
  it("accepts only consistent participant role and side combinations", () => {
    expect(lobbyParticipantSchema.parse(spectator("viewer"))).toEqual(
      spectator("viewer"),
    );
    expect(lobbyParticipantSchema.parse(debater("speaker", 1))).toEqual(
      debater("speaker", 1),
    );
    expect(() =>
      lobbyParticipantSchema.parse({
        id: "invalid",
        role: "spectator",
        sideIndex: 0,
      }),
    ).toThrow(/Invalid input/);
  });

  it("rejects malformed position requests", () => {
    expect(positionChangeBodySchema.parse({ sideIndex: null })).toEqual({
      sideIndex: null,
    });
    expect(() => positionChangeBodySchema.parse({ sideIndex: 2 })).toThrow(
      /Invalid input/,
    );
    expect(() => positionChangeBodySchema.parse({})).toThrow(/Invalid input/);
    expect(() =>
      positionChangeBodySchema.parse({ sideIndex: 0, participantId: "other" }),
    ).toThrow(/Unrecognized key/);
  });

  it("validates successful results and domain errors", () => {
    expect(
      positionChangeResultSchema.parse({ participant: debater("speaker", 0) }),
    ).toEqual({ participant: debater("speaker", 0) });
    expect(
      positionChangeErrorSchema.parse({
        code: "POSITION_UNAVAILABLE",
        message: "That debater position is already occupied.",
      }),
    ).toEqual({
      code: "POSITION_UNAVAILABLE",
      message: "That debater position is already occupied.",
    });
    expect(() =>
      positionChangeErrorSchema.parse({ code: "UNKNOWN", message: "Unknown" }),
    ).toThrow(/Invalid option/);
  });
});
