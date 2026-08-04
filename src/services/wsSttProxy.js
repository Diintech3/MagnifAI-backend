const WebSocket = require("ws");
const { env } = require("../config/env");
const { verifyAccessToken } = require("../utils/jwt");
const { CEO } = require("../models/CEO");

function setupSttProxy(server) {
  const wss = new WebSocket.Server({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const { pathname } = new URL(request.url, `http://${request.headers.host}`);
    if (pathname === "/api/agents/ws/transcribe") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", async (clientWs, req) => {
    console.log("[STT-Proxy] Client connected to WebSocket STT proxy");

    if (!env.UGC_AI_BASE_URL || !env.UGC_AI_APP_TOKEN) {
      console.error("[STT-Proxy] Error: UGC_AI_BASE_URL or UGC_AI_APP_TOKEN is missing");
      clientWs.close(1008, "Server AI configuration missing");
      return;
    }

    let agentId = "";
    try {
      const urlParsed = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      agentId = urlParsed.searchParams.get("agent_id");
      const tokenParam = urlParsed.searchParams.get("token");

      // Fallback: If agent_id is missing but token is provided, resolve agent_id from Database (CEO model)
      if (!agentId && tokenParam) {
        const decoded = verifyAccessToken(tokenParam);
        if (decoded && decoded.sub) {
          const ceo = await CEO.findById(decoded.sub);
          if (ceo && ceo.agentId) {
            agentId = ceo.agentId;
          }
        }
      }
    } catch (err) {
      console.error("[STT-Proxy] Authentication or parameter resolution error:", err.message);
      clientWs.close(1008, "Authentication failed");
      return;
    }

    if (!agentId) {
      console.error("[STT-Proxy] Error: agent_id is missing and could not be resolved from token");
      clientWs.close(1008, "agent_id is required");
      return;
    }

    // Convert http/https URL to ws/wss URL
    let targetBaseWsUrl = env.UGC_AI_BASE_URL.replace(/^http/, "ws").replace(/\/$/, "");

    // Build query params for the external server connection
    const targetParams = new URLSearchParams();
    targetParams.set("agent_id", agentId);

    // Forward any other query params as well, but exclude the sensitive token
    try {
      const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      urlObj.searchParams.forEach((value, key) => {
        if (key !== "agent_id" && key !== "token") {
          targetParams.append(key, value);
        }
      });
    } catch (e) {
      // Ignore URL parsing errors
    }

    const queryString = targetParams.toString() ? `?${targetParams.toString()}` : "";
    const targetWsUrl = `${targetBaseWsUrl}/api/agents/ws/transcribe${queryString}`;

    const urlParsed = new URL(env.UGC_AI_BASE_URL);
    console.log("[STT-Proxy] Connecting to external AI STT endpoint:", targetWsUrl);

    let externalWs;
    try {
      externalWs = new WebSocket(targetWsUrl, {
        headers: {
          "Host": urlParsed.host,
          "X-App-Token": env.UGC_AI_APP_TOKEN,
          "ngrok-skip-browser-warning": "true",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
    } catch (err) {
      console.error("[STT-Proxy] Failed to instantiate target WebSocket:", err);
      clientWs.close(1011, "Failed to connect to AI server");
      return;
    }

    const pendingBuffer = [];

    externalWs.on("open", () => {
      console.log("[STT-Proxy] Connected to external AI STT server");
      while (pendingBuffer.length > 0) {
        const msg = pendingBuffer.shift();
        if (externalWs.readyState === WebSocket.OPEN) {
          externalWs.send(msg);
        }
      }
    });

    externalWs.on("message", (data) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data);
      }
    });

    externalWs.on("error", (err) => {
      console.error("[STT-Proxy] External WS error:", err.message);
    });

    externalWs.on("close", (code, reason) => {
      console.log(`[STT-Proxy] External WS closed (${code})`);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(code, reason);
      }
    });

    // Forward messages from Client -> External AI Server
    clientWs.on("message", (message) => {
      if (externalWs.readyState === WebSocket.OPEN) {
        externalWs.send(message);
      } else {
        pendingBuffer.push(message);
      }
    });

    clientWs.on("close", () => {
      console.log("[STT-Proxy] Client disconnected");
      if (externalWs.readyState === WebSocket.OPEN || externalWs.readyState === WebSocket.CONNECTING) {
        externalWs.close();
      }
    });

    clientWs.on("error", (err) => {
      console.error("[STT-Proxy] Client WS error:", err.message);
      if (externalWs.readyState === WebSocket.OPEN) {
        externalWs.close();
      }
    });
  });

  return wss;
}

module.exports = { setupSttProxy };
