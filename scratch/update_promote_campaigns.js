const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'app', 'AppPromote.jsx');
let originalContent = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to \n for replacement
let content = originalContent.replace(/\r\n/g, '\n');

// 1. Replace loadWaCampaigns definition (Only if not already replaced)
const targetLoad = `  // Load WhatsApp Campaigns
  const loadWaCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const res = await api("/api/app/whatsapp/campaigns", { token });
      if (res) {
        const rawCampaigns = res.data?.campaigns || res.data || res.campaigns || res;
        if (Array.isArray(rawCampaigns)) {
          setWaCampaigns(rawCampaigns);
        } else {
          setWaCampaigns([]);
        }
      }
    } catch (e) {
      console.error("Failed to load WhatsApp campaigns:", e.message);
    } finally {
      setCampaignsLoading(false);
    }
  }, [token]);`;

const replacementLoad = `  // Load WhatsApp Campaigns
  const loadWaCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const res = await api("/api/app/whatsapp/campaigns", { token });
      if (res) {
        const rawCampaigns = res.data?.campaigns || res.data || res.campaigns || res;
        if (Array.isArray(rawCampaigns)) {
          const mapped = rawCampaigns.map(c => ({
            ...c,
            templateId: c.templateId || c.template,
            groupId: c.groupId || c.targetGroup
          }));
          setWaCampaigns(mapped);
        } else {
          setWaCampaigns([]);
        }
      }
    } catch (e) {
      console.error("Failed to load WhatsApp campaigns:", e.message);
    } finally {
      setCampaignsLoading(false);
    }
  }, [token]);`;

if (content.includes(targetLoad)) {
  content = content.replace(targetLoad, replacementLoad);
  console.log("SUCCESS: Mapped rawCampaigns inside loadWaCampaigns.");
} else {
  console.log("INFO: loadWaCampaigns already mapped or modified.");
}

// 2. Add handleResendCampaign right before "// Toggle AI Assist per chat" comment
const targetComment = `  // Toggle AI Assist per chat`;

const replacementComment = `  const handleResendCampaign = async (campaignId) => {
    try {
      const res = await api(\`/api/app/whatsapp/campaigns/\${campaignId}/send\`, {
        token,
        method: "POST"
      });
      if (res && res.success) {
        toastSuccess("Campaign broadcast re-triggered successfully!");
        loadWaCampaigns();
      } else {
        toastSuccess("Broadcast trigger request sent.");
      }
    } catch (e) {
      toastFromError(e, "Failed to re-trigger campaign");
    }
  };

  // Toggle AI Assist per chat`;

if (!content.includes(targetComment)) {
  console.error("ERROR: Target comment '// Toggle AI Assist per chat' not found!");
  process.exit(1);
}
content = content.replace(targetComment, replacementComment);
console.log("SUCCESS: Added handleResendCampaign before toggle AI comment.");

// 3. Update Table JSX
const targetTable = `                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-bold">
                              <th className="py-2">Campaign Name</th>
                              <th className="py-2">Template</th>
                              <th className="py-2">Target Group</th>
                              <th className="py-2 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {waCampaigns.map((c) => (
                              <tr key={c._id || c.id} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50/50">
                                <td className="py-2.5 font-bold text-slate-800">{c.name}</td>
                                <td className="py-2.5 text-slate-500 font-mono">{c.templateId}</td>
                                <td className="py-2.5 text-slate-500">{c.groupName || c.groupId}</td>
                                <td className="py-2.5 text-right">
                                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    {c.status || "SENT"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>`;

const replacementTable = `                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-bold">
                              <th className="py-2">Campaign Name</th>
                              <th className="py-2">Template</th>
                              <th className="py-2">Target Group</th>
                              <th className="py-2">Status</th>
                              <th className="py-2 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {waCampaigns.map((c) => (
                              <tr key={c._id || c.id} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50/50">
                                <td className="py-2.5 font-bold text-slate-800">{c.name}</td>
                                <td className="py-2.5 text-slate-500 font-mono">{c.templateId}</td>
                                <td className="py-2.5 text-slate-500">{c.groupName || c.groupId}</td>
                                <td className="py-2.5">
                                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    {c.status || "SENT"}
                                  </span>
                                </td>
                                <td className="py-2.5 text-right">
                                  <button
                                    onClick={() => handleResendCampaign(c._id || c.id)}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-amber-600 bg-slate-100 hover:bg-slate-200/60 rounded-lg px-2.5 py-1 transition-all"
                                  >
                                    <LuRefreshCw className="h-3 w-3" /> Re-trigger
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>`;

if (!content.includes(targetTable)) {
  console.error("ERROR: Target table JSX not found!");
  process.exit(1);
}
content = content.replace(targetTable, replacementTable);
console.log("SUCCESS: Updated Campaigns History table JSX.");

// Restore CRLF line endings if originally present
if (originalContent.includes('\r\n')) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("File saved successfully.");
