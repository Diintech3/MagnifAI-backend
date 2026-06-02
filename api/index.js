const { createApp } = require("../src/app");
const { connectDB } = require("../src/db/db");
const { ensureSuperAdmin } = require("../src/bootstrap/ensureSuperAdmin");

let appInstance = null;
let bootstrapPromise = null;

async function bootstrap() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await connectDB();
      await ensureSuperAdmin();
      appInstance = createApp();
      return appInstance;
    })();
  }
  return bootstrapPromise;
}

module.exports = async (req, res) => {
  const app = appInstance || (await bootstrap());
  return app(req, res);
};

