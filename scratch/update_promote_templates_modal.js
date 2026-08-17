const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'app', 'AppPromote.jsx');
let originalContent = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to \n for replacement
let content = originalContent.replace(/\r\n/g, '\n');

// 1. Add showCreateModal state
const targetState = `  const [templateSubmitting, setTemplateSubmitting] = useState(false);`;
const replacementState = `  const [templateSubmitting, setTemplateSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);`;

if (!content.includes(targetState)) {
  console.error("ERROR: Target state declaration not found!");
  process.exit(1);
}
content = content.replace(targetState, replacementState);
console.log("SUCCESS: Declared showCreateModal state.");

// 2. Add setShowCreateModal(false) in handleCreateTemplate
const targetSuccessReset = `        setTemplateName("");
        setHeaderText("");
        setBodyText("");
        setFooterText("");
      }`;

const replacementSuccessReset = `        setTemplateName("");
        setHeaderText("");
        setBodyText("");
        setFooterText("");
        setShowCreateModal(false);
      }`;

if (!content.includes(targetSuccessReset)) {
  console.error("ERROR: Target reset block in handleCreateTemplate not found!");
  process.exit(1);
}
content = content.replace(targetSuccessReset, replacementSuccessReset);
console.log("SUCCESS: Configured handleCreateTemplate to close modal on success.");

// 3. Update Templates subTab JSX layout
const targetTabJSX = `            {/* TEMPLATES SUB-TAB */}
            {subTab === "templates" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Create Template Form */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <LuPlus className="h-5 w-5 text-slate-500" />
                        <h3 className="text-base font-black text-slate-900">Create WhatsApp Template</h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Request Meta approval for new promotional/marketing templates.</p>
                    </div>

                    <form onSubmit={handleCreateTemplate} className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Template Name (Lowercase, no space)</label>
                          <input
                            type="text"
                            placeholder="e.g. discount_offer"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-amber-400 focus:outline-none transition-all font-mono"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Client Workspace Email</label>
                          <input
                            type="email"
                            placeholder="vijay.wiz@gmail.com"
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-slate-50/50 text-slate-400 cursor-not-allowed focus:outline-none"
                            disabled
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Category</label>
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-amber-400 focus:outline-none transition-all"
                          >
                            <option value="MARKETING">Marketing</option>
                            <option value="UTILITY">Utility</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Language</label>
                          <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-amber-400 focus:outline-none transition-all"
                          >
                            <option value="en">English (en)</option>
                            <option value="en_US">English US (en_US)</option>
                            <option value="hi">Hindi (hi)</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Header Text (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. Special Offer!"
                          value={headerText}
                          onChange={(e) => setHeaderText(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-amber-400 focus:outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Body Text (Required)</label>
                        <textarea
                          placeholder="e.g. Hello {{1}}, get {{2}}% off on your purchase. Use code {{3}}."
                          value={bodyText}
                          onChange={(e) => setBodyText(e.target.value)}
                          rows={3}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-amber-400 focus:outline-none transition-all resize-none"
                          required
                        ></textarea>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Footer Text (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. Thank you for shopping with us."
                          value={footerText}
                          onChange={(e) => setFooterText(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-amber-400 focus:outline-none transition-all"
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={templateSubmitting}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-900/10 bg-amber-400 text-slate-900 py-2.5 text-xs font-black hover:bg-amber-500 disabled:opacity-50 transition-all shadow-sm"
                        >
                          {templateSubmitting ? (
                            <LuLoader className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <LuPlus className="h-4 w-4" /> Submit Template Request
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Template Live Monitor */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-black text-slate-900">Template Status Monitor</h3>
                        <p className="text-xs text-slate-500 mt-0.5 font-sans">Check verified status of Meta templates.</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">`;

const replacementTabJSX = `            {/* TEMPLATES SUB-TAB */}
            {subTab === "templates" && (
              <div className="space-y-6 animate-fadeIn">
                {/* Create Template Modal */}
                {showCreateModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
                    <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4 m-4 relative animate-scaleUp">
                      <button
                        onClick={() => setShowCreateModal(false)}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-all"
                      >
                        <LuX className="h-5 w-5" />
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <LuPlus className="h-5 w-5 text-slate-500" />
                          <h3 className="text-base font-black text-slate-900">Create WhatsApp Template</h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Request Meta approval for new promotional/marketing templates.</p>
                      </div>

                      <form onSubmit={handleCreateTemplate} className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Template Name (Lowercase, no space)</label>
                            <input
                              type="text"
                              placeholder="e.g. discount_offer"
                              value={templateName}
                              onChange={(e) => setTemplateName(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-amber-400 focus:outline-none transition-all font-mono"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Client Workspace Email</label>
                            <input
                              type="email"
                              placeholder="vijay.wiz@gmail.com"
                              value={clientEmail}
                              onChange={(e) => setClientEmail(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-slate-50/50 text-slate-400 cursor-not-allowed focus:outline-none"
                              disabled
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Category</label>
                            <select
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-amber-400 focus:outline-none transition-all"
                            >
                              <option value="MARKETING">Marketing</option>
                              <option value="UTILITY">Utility</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Language</label>
                            <select
                              value={language}
                              onChange={(e) => setLanguage(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-amber-400 focus:outline-none transition-all"
                            >
                              <option value="en">English (en)</option>
                              <option value="en_US">English US (en_US)</option>
                              <option value="hi">Hindi (hi)</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Header Text (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. Special Offer!"
                            value={headerText}
                            onChange={(e) => setHeaderText(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-amber-400 focus:outline-none transition-all"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Body Text (Required)</label>
                          <textarea
                            placeholder="e.g. Hello {{1}}, get {{2}}% off on your purchase. Use code {{3}}."
                            value={bodyText}
                            onChange={(e) => setBodyText(e.target.value)}
                            rows={3}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-amber-400 focus:outline-none transition-all resize-none"
                            required
                          ></textarea>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Footer Text (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. Thank you for shopping with us."
                            value={footerText}
                            onChange={(e) => setFooterText(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-amber-400 focus:outline-none transition-all"
                          />
                        </div>

                        <div className="pt-2">
                          <button
                            type="submit"
                            disabled={templateSubmitting}
                            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-900/10 bg-amber-400 text-slate-900 py-2.5 text-xs font-black hover:bg-amber-500 disabled:opacity-50 transition-all shadow-sm"
                          >
                            {templateSubmitting ? (
                              <LuLoader className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <LuPlus className="h-4 w-4" /> Submit Template Request
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Template Live Monitor */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-900">Template Status Monitor</h3>
                      <p className="text-xs text-slate-500 mt-0.5 font-sans">Check verified status of Meta templates.</p>
                    </div>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-900/10 bg-amber-400 text-slate-900 px-4 py-2 text-xs font-black hover:bg-amber-500 transition-all shadow-sm"
                    >
                      <LuPlus className="h-4.5 w-4.5" /> Create New Template
                    </button>
                  </div>

                  <div className="overflow-x-auto">`;

if (!content.includes(targetTabJSX)) {
  console.error("ERROR: Target tab JSX layout not found!");
  process.exit(1);
}
content = content.replace(targetTabJSX, replacementTabJSX);
console.log("SUCCESS: Updated Templates tab layout to use full-width table and modal.");

// Restore CRLF line endings if originally present
if (originalContent.includes('\r\n')) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("File saved successfully.");
