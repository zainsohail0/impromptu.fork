import { z } from "zod";

export const lobbyStatusSchema = z.enum(["waiting", "active"]);
export const lobbyVisibilitySchema = z.enum(["public", "private"]);
export const lobbySideSchema = z.union([z.literal(0), z.literal(1)]);

export const lobbyParticipantSchema = z.discriminatedUnion("role", [
  z.strictObject({
    id: z.string().min(1),
    role: z.literal("spectator"),
    sideIndex: z.null(),
  }),
  z.strictObject({
    id: z.string().min(1),
    role: z.literal("debater"),
    sideIndex: lobbySideSchema,
  }),
]);

export const positionChangeBodySchema = z.strictObject({
  sideIndex: lobbySideSchema.nullable(),
});

export const positionChangeResultSchema = z.strictObject({
  participant: lobbyParticipantSchema,
});

export const positionChangeErrorSchema = z.strictObject({
  code: z.enum([
    "LOBBY_NOT_FOUND",
    "NOT_A_PARTICIPANT",
    "POSITION_UNAVAILABLE",
    "ROUND_ALREADY_STARTED",
  ]),
  message: z.string().min(1),
});

export const publicLobbySummarySchema = z.strictObject({
  id: z.string().min(1),
  question: z.string().trim().min(1),
  visibility: z.literal("public"),
  participantCount: z.number().int().nonnegative(),
  status: lobbyStatusSchema,
});

export const publicLobbyListSchema = z.array(publicLobbySummarySchema);

export const lobbyContracts = {
  publicLobbies: {
    method: "GET",
    path: "/api/lobbies/public",
    response: publicLobbyListSchema,
  },
} as const;

export type PublicLobbySummary = z.output<typeof publicLobbySummarySchema>;
export type LobbyParticipant = z.output<typeof lobbyParticipantSchema>;
export type PositionChangeInput = z.output<typeof positionChangeBodySchema>;
export type PositionChangeResult = z.output<typeof positionChangeResultSchema>;
export type PositionChangeError = z.output<typeof positionChangeErrorSchema>;
