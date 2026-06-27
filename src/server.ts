import { app } from "./app";
import { env } from "./config/env";
import { connectDb, disconnectDb } from "./db/connect";

async function bootstrap() {
  await connectDb();
  const server = app.listen(env.PORT, () => {
    console.log(`API server listening on port ${env.PORT}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((error) => {
  console.error("Failed to start API server", error);
  process.exit(1);
});
