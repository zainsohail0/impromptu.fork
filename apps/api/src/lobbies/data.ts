import type { z } from "zod";

import {
  lobbyStatusSchema,
  lobbyVisibilitySchema,
  type PublicLobbySummary,
} from "./contract.js";

type LobbyRecordFields = {
  id: string;
  question: string;
  initialTimeLimitSeconds: number;
  rebuttalTimeLimitSeconds: number;
  startTime: string | null;
  participantIds: string[];
  spectatorLimit: number | null;
  status: z.output<typeof lobbyStatusSchema>;
};

export type LobbyRecord = LobbyRecordFields &
  (
    | { ownerId: null; visibility: "public" }
    | {
        ownerId: string;
        visibility: Exclude<z.output<typeof lobbyVisibilitySchema>, "public">;
      }
  );

export type LobbyRepository = {
  list(): Promise<LobbyRecord[]>;
};

export function createMemoryLobbyRepository(
  initialLobbies: LobbyRecord[] = [],
): LobbyRepository {
  return {
    async list() {
      return initialLobbies;
    },
  };
}

export function toPublicLobbySummary(
  lobby: LobbyRecord,
): PublicLobbySummary | undefined {
  if (lobby.visibility !== "public") return undefined;

  return {
    id: lobby.id,
    question: lobby.question,
    visibility: "public",
    participantCount: lobby.participantIds.length,
    status: lobbyStatusSchema.parse(lobby.status),
  };
}
