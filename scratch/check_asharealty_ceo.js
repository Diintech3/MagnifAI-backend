const mongoose = require("mongoose");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const { CEO } = require("../src/models/CEO");
  const { User } = require("../src/models/User");

  const ceos = await CEO.find({ name: /Asha Realty/i });
  console.log("Asha Realty CEOs in DB:", ceos.map(c => ({
    _id: c._id.toString(),
    name: c.name,
    email: c.email,
    phone: c.phone,
    role: c.role,
    company: c.company,
    industry: c.industry,
    designation: c.designation,
    appId: c.appId?.toString(),
    userId: c.userId?.toString(),
    isSuperAdmin: c.isSuperAdmin
  })));

  const users = await User.find({ email: { $in: ["superadmin@gmail.com", "info@asharealty.co.in"] } });
  console.log("Users in DB:", users.map(u => ({
    _id: u._id.toString(),
    email: u.email,
    role: u.role,
    name: u.name
  })));

  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
