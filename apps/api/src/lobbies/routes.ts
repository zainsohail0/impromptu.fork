import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";

import { lobbyContracts } from "./contract.js";
import { toPublicLobbySummary, type LobbyRepository } from "./data.js";

export type LobbyRoutesOptions = {
  lobbies: LobbyRepository;
};

export const lobbyRoutes: FastifyPluginAsyncZod<LobbyRoutesOptions> = async (
  app,
  options,
) => {
  app.get(
    lobbyContracts.publicLobbies.path,
    { schema: { response: { 200: lobbyContracts.publicLobbies.response } } },
    async () => {
      const summaries = (await options.lobbies.list())
        .map(toPublicLobbySummary)
        .filter((lobby) => lobby !== undefined);

      return summaries.sort(
        (a, b) =>
          a.question.localeCompare(b.question) || a.id.localeCompare(b.id),
      );
    },
  );
};
