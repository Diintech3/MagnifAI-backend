const axios = require("axios");
const FormData = require("form-data");
const { env } = require("../config/env");

function getCleanErrorMessage(err) {
  if (!err) return "";
  let details = "";
  if (err.response && err.response.data) {
    const data = err.response.data;
    if (typeof data === "string") {
      if (data.includes("<html") || data.includes("<!DOCTYPE")) {
        const payloadMatch = data.match(/data-payload="([^"]+)"/);
        if (payloadMatch) {
          try {
            const decoded = JSON.parse(Buffer.from(payloadMatch[1], "base64").toString("utf-8"));
            details = ` (${decoded.message || decoded.title})`;
          } catch (e) {
            // ignore
          }
        }
        if (!details) {
          const noscriptMatch = data.match(/<noscript>(.*?)<\/noscript>/);
          if (noscriptMatch) {
            details = ` (${noscriptMatch[1].replace(/<[^>]*>/g, "").trim()})`;
          }
        }
        if (!details) {
          details = ` [HTML response: ${data.length} chars]`;
        }
      } else {
        details = ` (${data.slice(0, 200)})`;
      }
    } else if (typeof data === "object") {
      details = ` (${JSON.stringify(data)})`;
    }
  }
  return `${err.message}${details}`;
}

/**
 * Check if 3rdAI configuration is present in environment
 */
function isAiConfigured() {
  return Boolean(env.UGC_AI_BASE_URL && env.UGC_AI_APP_TOKEN);
}

/**
 * 1. Upload raw video to 3rdAI server
 * @param {Buffer} buffer - Video file buffer
 * @param {Buffer} buffer - Video file buffer
 * @param {string} filename - Filename (e.g. video.mp4)
 * @param {string} mimetype - Content type of video
 * @param {string} [scriptText] - Optional reference script plain text
 * @param {string} [source] - Optional source identifier (e.g. dashboard, magnifai)
 * @returns {Promise<string>} - Returns the unique job_id
 */
async function uploadVideoToAi(buffer, filename = "video.mp4", mimetype = "video/mp4", scriptText = "", source = "magnifai") {
  if (!isAiConfigured()) {
    throw new Error("3rdAI configuration is missing");
  }

  const baseUrl = env.UGC_AI_BASE_URL.replace(/\/$/, "");
  const token = env.UGC_AI_APP_TOKEN;

  const form = new FormData();
  form.append("file", buffer, { filename, contentType: mimetype });

  if (scriptText && typeof scriptText === "string" && scriptText.trim()) {
    form.append("script_text", scriptText.trim());
  }
  if (source) {
    form.append("source", source);
  }

  try {
    const uploadRes = await axios.post(`${baseUrl}/api/ugc/upload`, form, {
      headers: {
        "X-App-Token": token,
        ...form.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 1800000 // 30 minutes timeout for video upload (prevents timeout on larger files)
    });

    const jobId = uploadRes.data?.job_id;
    if (!jobId) {
      throw new Error("3rdAI upload failed: No job_id returned");
    }

    return jobId;
  } catch (err) {
    console.error("[3rdAI-upload-error]", getCleanErrorMessage(err));
    throw err;
  }
}

/**
 * 2. Start processing raw video with default UGC settings
 * @param {string} jobId - The job_id returned by upload
 * @param {string} [sendMode="auto"] - Send mode preference ("auto" | "manual")
 * @param {string} [brollSource="pexels"] - B-roll provider source ("pexels" | "google_flow")
 * @returns {Promise<boolean>}
 */
async function triggerProcessing(jobId, sendMode = "auto", brollSource = "pexels") {
  if (!isAiConfigured()) {
    throw new Error("3rdAI configuration is missing");
  }

  const baseUrl = env.UGC_AI_BASE_URL.replace(/\/$/, "");
  const token = env.UGC_AI_APP_TOKEN;

  const settings = {
    caption: true,
    subtitle_style: "two_line_zoom_in",
    broll: true,
    broll_source: brollSource || "pexels",
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
    video_quality: "1080p",
    send_mode: sendMode
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
    console.error("[3rdAI-process-error]", getCleanErrorMessage(err));
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
      viralUrl: res.data.viral_video_path || res.data.viral_video_url || "",
      errorMessage: res.data.error_message || ""
    };
  } catch (err) {
    console.error("[3rdAI-status-error]", getCleanErrorMessage(err));
    throw err;
  }
}

/**
 * 4. Dedicated script upload/update for an existing job
 * @param {string} jobId - The job_id
 * @param {{ scriptText?: string, fileBuffer?: Buffer, filename?: string }} scriptData
 * @returns {Promise<object>}
 */
async function uploadScriptToAi(jobId, scriptData = {}) {
  if (!isAiConfigured()) {
    throw new Error("3rdAI configuration is missing");
  }

  const baseUrl = env.UGC_AI_BASE_URL.replace(/\/$/, "");
  const token = env.UGC_AI_APP_TOKEN;

  const form = new FormData();
  if (scriptData.fileBuffer) {
    form.append("file", scriptData.fileBuffer, { filename: scriptData.filename || "script.txt" });
  } else if (scriptData.scriptText) {
    form.append("script_text", scriptData.scriptText);
  } else {
    throw new Error("No script text or script file provided");
  }

  try {
    const res = await axios.post(`${baseUrl}/api/ugc/upload-script/${jobId}`, form, {
      headers: {
        "X-App-Token": token,
        ...form.getHeaders()
      },
      timeout: 30000
    });
    return res.data;
  } catch (err) {
    console.error("[3rdAI-upload-script-error]", getCleanErrorMessage(err));
    throw err;
  }
}

/**
 * 5. Preview AI generated Image & Video B-Roll Prompts
 * @param {string} jobId - The job_id
 * @returns {Promise<object>}
 */
async function getAiBrollPrompts(jobId) {
  if (!isAiConfigured()) {
    throw new Error("3rdAI configuration is missing");
  }

  const baseUrl = env.UGC_AI_BASE_URL.replace(/\/$/, "");
  const token = env.UGC_AI_APP_TOKEN;

  try {
    const res = await axios.get(`${baseUrl}/api/ugc/analyze-broll/${jobId}`, {
      headers: {
        "X-App-Token": token
      },
      timeout: 30000
    });
    return res.data;
  } catch (err) {
    console.error("[3rdAI-analyze-broll-error]", getCleanErrorMessage(err));
    throw err;
  }
}

module.exports = {
  isAiConfigured,
  uploadVideoToAi,
  triggerProcessing,
  checkJobStatus,
  uploadScriptToAi,
  getAiBrollPrompts
};
