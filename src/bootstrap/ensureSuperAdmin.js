const { env } = require("../config/env");
const { User } = require("../models/User");
const { hashPassword, verifyPassword } = require("../utils/password");

async function ensureSuperAdmin() {
  const email = env.SUPERADMIN_EMAIL;
  const passwordHash = await hashPassword(env.SUPERADMIN_PASSWORD);

  const user = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        name: env.SUPERADMIN_NAME,
        passwordHash,
        role: "SUPERADMIN",
        isActive: true,
      },
      $unset: { password: "" },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  const passwordOk = user?.passwordHash
    ? await verifyPassword(env.SUPERADMIN_PASSWORD, user.passwordHash)
    : false;
  if (!passwordOk) {
    throw new Error("[bootstrap] SuperAdmin password verification failed");
  }

  // eslint-disable-next-line no-console
  console.log("[bootstrap] SuperAdmin ready:", email);
}

module.exports = { ensureSuperAdmin };
