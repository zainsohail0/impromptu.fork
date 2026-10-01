import type { z } from "zod";

import { lobbyStatusSchema, type PublicLobbySummary } from "./contract.js";

export type PublicLobbyRecord = {
  id: string;
  question: string;
  initialTimeLimitSeconds: number;
  rebuttalTimeLimitSeconds: number;
  startTime: string | null;
  participantIds: string[];
  spectatorLimit: number | null;
  status: z.output<typeof lobbyStatusSchema>;
  visibility: "public";
};

export type PublicLobbyRepository = {
  list(): Promise<PublicLobbyRecord[]>;
};

export function createMemoryPublicLobbyRepository(
  initialLobbies: PublicLobbyRecord[] = [],
): PublicLobbyRepository {
  return {
    async list() {
      return initialLobbies;
    },
  };
}

export function toPublicLobbySummary(
  lobby: PublicLobbyRecord,
): PublicLobbySummary {
  return {
    id: lobby.id,
    question: lobby.question,
    visibility: "public",
    participantCount: lobby.participantIds.length,
    status: lobbyStatusSchema.parse(lobby.status),
  };
}
