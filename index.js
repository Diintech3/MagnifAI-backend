const { createApp } = require("./src/app");
const { env } = require("./src/config/env");
const { connectDB } = require("./src/db/db");
const { ensureSuperAdmin } = require("./src/bootstrap/ensureSuperAdmin");

async function start() {
  await connectDB();
  await ensureSuperAdmin();

  const app = createApp();
  app.listen(env.PORT, () => {
    const dbName = require("mongoose").connection.name;
    // eslint-disable-next-line no-console
    console.log(`[backend] listening on http://localhost:${env.PORT} (db: ${dbName})`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[backend] failed to start:", err);
  process.exit(1);
});