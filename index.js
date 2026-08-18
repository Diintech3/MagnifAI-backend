const http = require("http");
const { createApp } = require("./src/app");
const { env } = require("./src/config/env");
const { connectDB } = require("./src/db/db");
const { ensureSuperAdmin } = require("./src/bootstrap/ensureSuperAdmin");
const { ensureCeoAgentMapping } = require("./src/bootstrap/ensureCeoAgentMapping");
const { setupSttProxy } = require("./src/services/wsSttProxy");

async function start() {
  await connectDB();
  await ensureSuperAdmin();
  await ensureCeoAgentMapping();

  const app = createApp();
  const server = http.createServer(app);

  setupSttProxy(server);

  server.listen(env.PORT, () => {
    const dbName = require("mongoose").connection.name;
    // eslint-disable-next-line no-console
    console.log(`[backend] listening on http://localhost:${env.PORT} (db: ${dbName})`);
    
    // Start background UGC AI video processing polling (triggered reload)
    const { startUgcAiPolling } = require("./src/services/ugcAiPollingService");
    startUgcAiPolling();
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[backend] failed to start:", err);
  process.exit(1);
});
// Reload triggered: 2026-08-18T19:46:50Z