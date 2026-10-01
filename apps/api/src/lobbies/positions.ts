import type {
  LobbyParticipant,
  PositionChangeError,
  PositionChangeInput,
  PositionChangeResult,
} from "./contract.js";

export type LobbyPositionState = {
  id: string;
  status: "waiting" | "active";
  participants: LobbyParticipant[];
};

export type ChangePositionResult =
  | { ok: true; value: PositionChangeResult }
  | { ok: false; error: PositionChangeError };

export type ChangePositionCommand = {
  lobbyId: string;
  participantId: string;
  input: PositionChangeInput;
};

export type PositionRepository = {
  changePosition(command: ChangePositionCommand): Promise<ChangePositionResult>;
};

function copyParticipant(participant: LobbyParticipant): LobbyParticipant {
  return { ...participant };
}

function copyLobby(lobby: LobbyPositionState): LobbyPositionState {
  return {
    ...lobby,
    participants: lobby.participants.map(copyParticipant),
  };
}

export function createMemoryPositionRepository(
  initialLobbies: LobbyPositionState[],
): PositionRepository & {
  getLobby(lobbyId: string): LobbyPositionState | undefined;
} {
  const lobbies = new Map(
    initialLobbies.map((lobby) => [lobby.id, copyLobby(lobby)]),
  );
  const locks = new Map<string, Promise<void>>();

  async function inLobbyLock<T>(lobbyId: string, action: () => T | Promise<T>) {
    const previous = locks.get(lobbyId) ?? Promise.resolve();
    let release: () => void = () => {};
    const turn = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => turn);
    locks.set(lobbyId, queued);
    await previous;

    try {
      return await action();
    } finally {
      release();
      if (locks.get(lobbyId) === queued) locks.delete(lobbyId);
    }
  }

  return {
    changePosition({
      lobbyId,
      participantId,
      input,
    }: ChangePositionCommand): Promise<ChangePositionResult> {
      return inLobbyLock(lobbyId, () => {
        const lobby = lobbies.get(lobbyId);
        if (!lobby) {
          return {
            ok: false,
            error: {
              code: "LOBBY_NOT_FOUND",
              message: "Lobby not found.",
            },
          };
        }

        const participantIndex = lobby.participants.findIndex(
          (participant) => participant.id === participantId,
        );
        const participant = lobby.participants[participantIndex];
        if (!participant) {
          return {
            ok: false,
            error: {
              code: "NOT_A_PARTICIPANT",
              message: "You are not a participant in this lobby.",
            },
          };
        }

        if (lobby.status !== "waiting") {
          return {
            ok: false,
            error: {
              code: "ROUND_ALREADY_STARTED",
              message: "Positions cannot change after the round starts.",
            },
          };
        }

        if (input.sideIndex === null) {
          const updated: LobbyParticipant = {
            id: participant.id,
            role: "spectator",
            sideIndex: null,
          };
          lobby.participants[participantIndex] = updated;
          return { ok: true, value: { participant: copyParticipant(updated) } };
        }

        const occupied = lobby.participants.some(
          (candidate) =>
            candidate.id !== participant.id &&
            candidate.role === "debater" &&
            candidate.sideIndex === input.sideIndex,
        );
        if (occupied) {
          return {
            ok: false,
            error: {
              code: "POSITION_UNAVAILABLE",
              message: "That debater position is already occupied.",
            },
          };
        }

        const updated: LobbyParticipant = {
          id: participant.id,
          role: "debater",
          sideIndex: input.sideIndex,
        };
        lobby.participants[participantIndex] = updated;
        return { ok: true, value: { participant: copyParticipant(updated) } };
      });
    },

    getLobby(lobbyId: string) {
      const lobby = lobbies.get(lobbyId);
      return lobby ? copyLobby(lobby) : undefined;
    },
  };
}
