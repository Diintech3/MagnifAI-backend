const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { requireAuth, requireRole } = require("./middleware/auth");
const { authRouter } = require("./routes/auth");
const { superadminRouter } = require("./routes/superadmin");
const { adminRouter } = require("./routes/admin");
const { appPortalRouter } = require("./routes/appPortal");
const { candidatePortalRouter } = require("./routes/candidatePortal");
const { publicMediaRouter } = require("./routes/publicMedia");

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: true,
      credentials: false,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/public", publicMediaRouter);
  app.use("/api/auth", authRouter);

  app.use("/api/superadmin", requireAuth, requireRole("SUPERADMIN"), superadminRouter);
  app.use("/api/admin", requireAuth, requireRole("ADMIN", "SUPERADMIN"), adminRouter);
  app.use("/api/app", requireAuth, requireRole("APP"), appPortalRouter);
  app.use("/api/candidate", requireAuth, requireRole("CANDIDATE"), candidatePortalRouter);

  // fallback
  app.use((_req, res) => res.status(404).json({ error: "NOT_FOUND" }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    // eslint-disable-next-line no-console
    console.error("[error]", err);
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "FILE_TOO_LARGE" });
    }
    if (err.message === "INVALID_FILE_TYPE") {
      return res.status(400).json({ error: "INVALID_FILE_TYPE" });
    }
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  });

  return app;
}

module.exports = { createApp };

