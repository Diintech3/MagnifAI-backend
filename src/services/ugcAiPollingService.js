const { Script } = require("../models/Script");
const { checkJobStatus, isAiConfigured } = require("./ugcAiService");
const { uploadToR2 } = require("../utils/r2");
const axios = require("axios");
const yovoApiBaseUrl = process.env.YOVOAI_API_BASE_URL || "https://app.yovoai.com";

let pollingInterval = null;
const failedPollAttempts = {};

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
        
        // Reset failed poll attempts counter on successful fetch
        delete failedPollAttempts[script._id.toString()];

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

          // YOVO AI Campaign auto-submission
          if (script.campaignId && script.processedVideoUrl) {
            console.log(`[ugc-polling] Script "${script.title}" is linked to campaign ${script.campaignId}. Triggering auto-submit to YOVO AI...`);
            try {
              const userIdStr = script.userId ? script.userId.toString() : "external-agent";
              await axios.post(
                `${yovoApiBaseUrl}/api/auth/user/campaign/register/${script.campaignId}`,
                {
                  userId: userIdStr,
                  videoUrl: script.processedVideoUrl
                },
                { timeout: 8000 }
              );
              
              await axios.post(
                `${yovoApiBaseUrl}/api/auth/user/campaign/activeparticipants/${script.campaignId}`,
                {
                  userId: userIdStr
                },
                { timeout: 8000 }
              );

              // Also register the video response in YOVO AI's database so it shows up in dashboards
              await axios.post(
                `${yovoApiBaseUrl}/api/pools/user/response/${userIdStr}`,
                {
                  url: script.processedVideoUrl,
                  campaignId: script.campaignId
                },
                { timeout: 8000 }
              );
              console.log(`[ugc-polling] YOVO AI submission successful for campaign ${script.campaignId}`);
            } catch (submitErr) {
              console.error(`[ugc-polling] YOVO AI submission failed for campaign ${script.campaignId}:`, submitErr.message);
            }
          }
        } else if (job.status === "failed") {
          console.error(`[ugc-polling] Script "${script.title}" AI editing failed on 3rdAI server:`, job.errorMessage);
          script.processingStatus = "failed";
          script.processingProgress = 0;
          // Reset approvalStatus to Submitted so the retry buttons remain active on frontend
          script.approvalStatus = "Submitted";

          // Provide user-friendly message instead of raw error details
          let userFriendlyMessage = "AI video processing failed on external engine. Please check your video or try again.";
          if (job.errorMessage && (job.errorMessage.includes("401") || job.errorMessage.toLowerCase().includes("api key") || job.errorMessage.toLowerCase().includes("unauthorized"))) {
            userFriendlyMessage = "AI editing failed due to a system authentication error. Please contact support.";
          }
          script.objectionNote = userFriendlyMessage;

          script.statusHistory.push({
            status: script.approvalStatus,
            changedBy: "3rdAI Engine",
            note: job.errorMessage ? `AI video processing failed: ${job.errorMessage}` : "AI video processing failed on external engine."
          });

          await script.save();
        }
      } catch (scriptErr) {
        console.error(`[ugc-polling] Error processing status for script "${script.title}":`, scriptErr.message);
        // Do not update the status in database for network or API request glitches. Keep retrying.
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
