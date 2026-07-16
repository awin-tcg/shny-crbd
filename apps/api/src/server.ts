import { buildApp } from "./app.js";

const host = process.env.API_HOST ?? "127.0.0.1";
const port = Number(process.env.API_PORT ?? 4000);

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("API_PORT must be a valid TCP port");
}

const app = await buildApp({ seedDemo: process.env.NODE_ENV !== "production" });

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "shutting down");
  await app.close();
  process.exit(0);
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

await app.listen({ host, port });
