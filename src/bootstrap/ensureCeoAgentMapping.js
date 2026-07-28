const { CEO } = require("../models/CEO");

async function ensureCeoAgentMapping() {
  try {
    const email = "vijay.wiz@gmail.com";
    const existingAgentId = "b7981f6037ed62d0";

    const ceo = await CEO.findOne({ email });
    if (ceo) {
      if (!ceo.agentId) {
        await CEO.updateOne({ _id: ceo._id }, { $set: { agentId: existingAgentId } });
        // eslint-disable-next-line no-console
        console.log(`[bootstrap] Mapped CEO Vijay Kumar to existing agent ID: ${existingAgentId}`);
      } else {
        // eslint-disable-next-line no-console
        console.log(`[bootstrap] CEO Vijay Kumar already mapped to agent ID: ${ceo.agentId}`);
      }
    } else {
      // eslint-disable-next-line no-console
      console.log(`[bootstrap] CEO Vijay Kumar (${email}) not found, skipping startup migration`);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[bootstrap] Error mapping CEO to agent:", err);
  }
}

module.exports = { ensureCeoAgentMapping };
