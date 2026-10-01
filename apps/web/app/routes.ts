import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("lobbies", "routes/lobbies.tsx"),
  route("debates/:topicId", "routes/debate.tsx"),
] satisfies RouteConfig;
