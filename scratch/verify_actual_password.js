const { verifyPassword } = require("../src/utils/password");

async function check() {
  const hash = "$2b$12$kfYLpiC3SO06UkiyEGzFeejkkja.r5KX99faT5K1qQ4dIbr4S/xZu";
  const ok = await verifyPassword("password123", hash);
  console.log(`\nPassword "password123" verification result: ${ok ? 'SUCCESS ✅' : 'FAILED ❌'}`);
}

check();
