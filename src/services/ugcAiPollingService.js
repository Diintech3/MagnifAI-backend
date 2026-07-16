const { Script } = require("../models/Script");
const { checkJobStatus, isAiConfigured } = require("./ugcAiService");
const { uploadToR2 } = require("../utils/r2");
const axios = require("axios");

let pollingInterval = null;

async function pollRealAiJobs() {
  try {
    // Fetch scripts that are currently processing
    const activeScripts = await Script.find({
      processingStatus: "processing",
      aiJobId: { $ne: null, $ne: "" }
    });

    if (activeScripts.length === 0) return;

    console.log(`[ugc-polling] Found ${activeScripts.length} active UGC video processing jobs...`);

    for (const script of activeScripts) {
      try {
        const jobId = script.aiJobId;
        const job = await checkJobStatus(jobId);

        if (job.status === "processing") {
          // Update progress
          script.processingProgress = job.progress || 0;
          await script.save();
          console.log(`[ugc-polling] Script "${script.title}" status: processing (${job.progress}%)`);
        } else if (job.status === "completed") {
          console.log(`[ugc-polling] Script "${script.title}" AI editing completed. Downloading processed videos...`);
          
          let processedKeyUrl = null;
          let viralKeyUrl = null;

          // 1. Download result video
          if (job.processedUrl) {
            try {
              const res = await axios.get(job.processedUrl, { responseType: "arraybuffer", timeout: 60000 });
              const buffer = Buffer.from(res.data);
              const uploadRes = await uploadToR2({
                originalname: `${script._id}_processed.mp4`,
                mimetype: "video/mp4",
                buffer
              }, "scripts/videos/processed");
              processedKeyUrl = uploadRes.url;
            } catch (err) {
              console.error(`[ugc-polling] Failed to download/upload processed video for "${script.title}":`, err.message);
            }
          }

          // 2. Download viral video
          if (job.viralUrl) {
            try {
              const res = await axios.get(job.viralUrl, { responseType: "arraybuffer", timeout: 60000 });
              const buffer = Buffer.from(res.data);
              const uploadRes = await uploadToR2({
                originalname: `${script._id}_viral.mp4`,
                mimetype: "video/mp4",
                buffer
              }, "scripts/videos/viral");
              viralKeyUrl = uploadRes.url;
            } catch (err) {
              console.error(`[ugc-polling] Failed to download/upload viral video for "${script.title}":`, err.message);
            }
          }

          // 3. Update database
          script.processedVideoUrl = processedKeyUrl;
          script.viralVideoUrl = viralKeyUrl;
          script.processingStatus = "completed";
          script.processingProgress = 100;
          script.approvalStatus = "Edited";
          
          script.statusHistory.push({
            status: "Edited",
            changedBy: "3rdAI Engine",
            note: "Automatic AI video processing completed successfully."
          });

          await script.save();
          console.log(`[ugc-polling] Script "${script.title}" updated to status "Edited".`);
        } else if (job.status === "failed") {
          console.error(`[ugc-polling] Script "${script.title}" AI editing failed on 3rdAI server.`);
          script.processingStatus = "failed";
          script.processingProgress = 0;
          
          // Reset approvalStatus so the buttons become active for retry
          if (script.createdByAdmin) {
            script.approvalStatus = "Submitted";
          } else {
            script.approvalStatus = "Draft";
          }

          script.statusHistory.push({
            status: script.approvalStatus,
            changedBy: "3rdAI Engine",
            note: "AI video processing failed on external engine."
          });

          await script.save();
        }
      } catch (scriptErr) {
        console.error(`[ugc-polling] Error processing status for script "${script.title}":`, scriptErr.message);
      }
    }
  } catch (err) {
    console.error("[ugc-polling-fatal]", err.message);
  }
}

function startUgcAiPolling() {
  if (!isAiConfigured()) {
    console.warn("[ugc-polling] 3rdAI env variables are not fully configured. Polling service is disabled.");
    return;
  }

  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  // Poll every 15 seconds
  pollingInterval = setInterval(pollRealAiJobs, 15000);
  console.log("[ugc-polling] UGC AI background video processing polling service started (every 15s).");
}

module.exports = {
  startUgcAiPolling
};
