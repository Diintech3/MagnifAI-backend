const { getObjectFromR2 } = require("./r2");
const { uploadVideoToAi, triggerProcessing } = require("../services/ugcAiService");

const { Script } = require("../models/Script");

/**
 * Downloads raw video from R2, uploads to 3rdAI, and triggers the AI editing engine.
 * Updates script model with the job ID and sets status to 'Editing' / processingStatus to 'processing'.
 * @param {string} scriptId - The script ID
 */
async function triggerAiPipelineForScript(scriptId) {
  try {
    const script = await Script.findById(scriptId);
    if (!script) {
      throw new Error(`Script ${scriptId} not found`);
    }

    if (!script.rawVideoUrl) {
      throw new Error("No raw video URL found on script");
    }

    // 1. Update status to uploading
    script.processingStatus = "uploading";
    script.processingProgress = 10;
    await script.save();

    // 2. Extract key from rawVideoUrl
    let key = script.rawVideoUrl;
    if (key.includes("key=")) {
      key = decodeURIComponent(key.split("key=")[1]);
    } else if (key.startsWith("http")) {
      try {
        const urlObj = new URL(key);
        key = urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname;
      } catch (e) {
        console.error("[ugc-pipeline] Failed parsing key as URL", e);
      }
    }

    console.log(`[ugc-pipeline] Downloading raw video from R2 for script "${script.title}" (key: ${key})...`);
    
    // Download raw video from R2
    let object;
    let retries = 3;
    while (retries > 0) {
      try {
        object = await getObjectFromR2(key);
        break;
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    let buffer;
    if (object.Body.transformToByteArray) {
      const bytes = await object.Body.transformToByteArray();
      buffer = Buffer.from(bytes);
    } else if (object.Body.pipe) {
      const chunks = [];
      for await (const chunk of object.Body) {
        chunks.push(chunk);
      }
      buffer = Buffer.concat(chunks);
    } else {
      throw new Error("Unsupported R2 stream format");
    }

    // 3. Upload to 3rdAI server
    console.log(`[ugc-pipeline] Uploading raw video to 3rdAI server for script "${script.title}"...`);
    const jobId = await uploadVideoToAi(buffer, `${script._id}_raw.mp4`, "video/mp4");

    // 4. Trigger AI video editing based on creator's sendMode preference
    let resolvedSendMode = "auto";
    if (script.userId) {
      const { CEO } = require("../models/CEO");
      const { Candidate } = require("../models/Candidate");
      let creatorObj = await CEO.findById(script.userId);
      if (!creatorObj) {
        creatorObj = await Candidate.findById(script.userId);
      }
      if (creatorObj && creatorObj.sendMode) {
        resolvedSendMode = creatorObj.sendMode;
      }
    } else {
      resolvedSendMode = script.sendMode || "auto";
    }

    console.log(`[ugc-pipeline] Triggering 3rdAI editing process for script "${script.title}" (jobId: ${jobId}, sendMode: ${resolvedSendMode})...`);
    await triggerProcessing(jobId, resolvedSendMode);

    // 5. Update DB
    script.aiJobId = jobId;
    script.processingStatus = "processing";
    script.processingProgress = 20;
    script.approvalStatus = "Editing";
    await script.save();

    console.log(`[ugc-pipeline] 3rdAI processing successfully triggered for script "${script.title}".`);
  } catch (err) {
    console.error(`[ugc-pipeline-error] Failed to trigger AI pipeline for script "${script.title}":`, err.message);
    script.processingStatus = "failed";
    script.processingProgress = 0;
    script.objectionNote = `Pipeline trigger failed: ${err.message}`;
    // Reset approvalStatus to Submitted so the retry buttons remain active on frontend
    script.approvalStatus = "Submitted";
    await script.save();
  }
}

module.exports = {
  triggerAiPipelineForScript
};
