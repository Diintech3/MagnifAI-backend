const axios = require("axios");
const FormData = require("form-data");
const { env } = require("../config/env");

/**
 * Check if 3rdAI configuration is present in environment
 */
function isAiConfigured() {
  return Boolean(env.UGC_AI_BASE_URL && env.UGC_AI_APP_TOKEN);
}

/**
 * 1. Upload raw video to 3rdAI server
 * @param {Buffer} buffer - Video file buffer
 * @param {string} filename - Filename (e.g. video.mp4)
 * @param {string} mimetype - Content type of video
 * @returns {Promise<string>} - Returns the unique job_id
 */
async function uploadVideoToAi(buffer, filename = "video.mp4", mimetype = "video/mp4") {
  if (!isAiConfigured()) {
    throw new Error("3rdAI configuration is missing");
  }

  const baseUrl = env.UGC_AI_BASE_URL.replace(/\/$/, "");
  const token = env.UGC_AI_APP_TOKEN;

  const form = new FormData();
  form.append("file", buffer, { filename, contentType: mimetype });

  try {
    const uploadRes = await axios.post(`${baseUrl}/api/ugc/upload`, form, {
      headers: {
        "X-App-Token": token,
        ...form.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 120000 // 2 minutes timeout for video upload
    });

    const jobId = uploadRes.data?.job_id;
    if (!jobId) {
      throw new Error("3rdAI upload failed: No job_id returned");
    }

    return jobId;
  } catch (err) {
    console.error("[3rdAI-upload-error]", err.message, err.response?.data || "");
    throw err;
  }
}

/**
 * 2. Start processing raw video with default UGC settings
 * @param {string} jobId - The job_id returned by upload
 * @returns {Promise<boolean>}
 */
async function triggerProcessing(jobId) {
  if (!isAiConfigured()) {
    throw new Error("3rdAI configuration is missing");
  }

  const baseUrl = env.UGC_AI_BASE_URL.replace(/\/$/, "");
  const token = env.UGC_AI_APP_TOKEN;

  const settings = {
    caption: true,
    subtitle_style: "two_line_zoom_in",
    broll: true,
    broll_source: "pexels",
    music: true,
    bgm_mood: "Motivational",
    sfx: true,
    zoom: true,
    silence: true,
    jumpcut: true,
    facetrack: true,
    viral: true,
    background: false,
    logo: true,
    video_quality: "1080p"
  };

  try {
    await axios.post(`${baseUrl}/api/ugc/process/${jobId}`, settings, {
      headers: {
        "X-App-Token": token,
        "Content-Type": "application/json"
      },
      timeout: 30000 // 30 seconds timeout
    });

    return true;
  } catch (err) {
    console.error("[3rdAI-process-error]", err.message, err.response?.data || "");
    throw err;
  }
}

/**
 * 3. Poll/check the status of a processing video job
 * @param {string} jobId - Job ID
 * @returns {Promise<{ status: string, progress: number, processedUrl: string, viralUrl: string }>}
 */
async function checkJobStatus(jobId) {
  if (!isAiConfigured()) {
    throw new Error("3rdAI configuration is missing");
  }

  const baseUrl = env.UGC_AI_BASE_URL.replace(/\/$/, "");
  const token = env.UGC_AI_APP_TOKEN;

  try {
    const res = await axios.get(`${baseUrl}/api/ugc/job/${jobId}`, {
      headers: {
        "X-App-Token": token
      },
      timeout: 10000 // 10 seconds timeout
    });

    return {
      status: res.data.status, // 'processing' | 'completed' | 'failed'
      progress: res.data.progress || 0,
      processedUrl: res.data.result_video_path || res.data.result_video_url || "",
      viralUrl: res.data.viral_video_path || res.data.viral_video_url || ""
    };
  } catch (err) {
    console.error("[3rdAI-status-error]", err.message, err.response?.data || "");
    throw err;
  }
}

module.exports = {
  isAiConfigured,
  uploadVideoToAi,
  triggerProcessing,
  checkJobStatus
};
