import { healthContract } from "./health/contract.js";
import { lobbyContracts } from "./lobbies/contract.js";
import { topicContracts } from "./topics/contract.js";

export {
  lobbyParticipantSchema,
  positionChangeBodySchema,
  positionChangeRequestSchema,
  positionChangeErrorSchema,
  positionChangeResultSchema,
  type LobbyParticipant,
  type PositionChangeError,
  type PositionChangeInput,
  type PositionChangeRequest,
  type PositionChangeResult,
  type PublicLobbySummary,
} from "./lobbies/contract.js";

export {
  errorSchema,
  joinBodySchema,
  joinResultSchema,
  sideUnavailableErrorSchema,
  type JoinInput,
  type JoinByCodeInput,
  type JoinResult,
  type PrivateLobbyCreateInput,
  type PrivateLobbyPreview,
  type SideUnavailableError,
  type TopicStatus,
} from "./topics/contract.js";

export const PRODUCT = {
  name: "impromptu",
  domain: "impromptu.social",
} as const;

export const apiContract = {
  health: healthContract,
  ...lobbyContracts,
  ...topicContracts,
} as const;
