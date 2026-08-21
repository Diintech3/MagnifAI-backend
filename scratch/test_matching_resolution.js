const assert = require("assert");

const mockTemplates = [
  { _id: "6a6712cab661e9927c92a350", name: "festival_greetings", whatsappTemplateName: "festival_greetings" },
  { id: "6a6b1551c8cc32ce3311bcaf", name: "ai_assistant", whatsappTemplateName: "ai_assistant" }
];

function resolveTemplate(campaignTemplate, tList) {
  const rawTemplate = campaignTemplate;
  const campaignTemplateId = typeof rawTemplate === "object" ? (rawTemplate._id || rawTemplate.id) : rawTemplate;
  
  return tList.find(t => 
    String(t._id || t.id || "") === String(campaignTemplateId || "") ||
    String(t.name || "").toLowerCase() === String(campaignTemplateId || "").toLowerCase() ||
    String(t.whatsappTemplateName || "").toLowerCase() === String(campaignTemplateId || "").toLowerCase()
  );
}

// Test Case 1: campaign template is a string hex ID matching _id
const r1 = resolveTemplate("6a6712cab661e9927c92a350", mockTemplates);
assert.strictEqual(r1.name, "festival_greetings");
console.log("Test Case 1 passed: Resolved hex ID to name correctly.");

// Test Case 2: campaign template is a string hex ID matching id
const r2 = resolveTemplate("6a6b1551c8cc32ce3311bcaf", mockTemplates);
assert.strictEqual(r2.name, "ai_assistant");
console.log("Test Case 2 passed: Resolved hex ID (no underscore) to name correctly.");

// Test Case 3: campaign template is an object
const r3 = resolveTemplate({ _id: "6a6712cab661e9927c92a350" }, mockTemplates);
assert.strictEqual(r3.name, "festival_greetings");
console.log("Test Case 3 passed: Resolved object template correctly.");

// Test Case 4: campaign template is a string name
const r4 = resolveTemplate("ai_assistant", mockTemplates);
assert.strictEqual(r4.name, "ai_assistant");
console.log("Test Case 4 passed: Resolved template name string correctly.");

console.log("\nALL OFFLINE MATCHING LOGIC TESTS PASSED SUCCESSFULLY!");
