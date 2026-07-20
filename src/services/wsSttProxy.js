const WebSocket = require("ws");
const { env } = require("../config/env");

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

  wss.on("connection", (clientWs, req) => {
    console.log("[STT-Proxy] Client connected to WebSocket STT proxy");

    if (!env.UGC_AI_BASE_URL || !env.UGC_AI_APP_TOKEN) {
      console.error("[STT-Proxy] Error: UGC_AI_BASE_URL or UGC_AI_APP_TOKEN is missing");
      clientWs.close(1008, "Server AI configuration missing");
      return;
    }

    // Convert http/https URL to ws/wss URL and preserve query params (e.g. ?agent_id=...)
    let targetBaseWsUrl = env.UGC_AI_BASE_URL.replace(/^http/, "ws").replace(/\/$/, "");
    const queryString = req.url && req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
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
