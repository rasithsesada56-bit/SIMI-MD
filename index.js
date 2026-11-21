
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from "@whiskeysockets/baileys";

import { Boom } from "@hapi/boom";
import P from "pino";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import readline from "node:readline";

import config from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, "auth_info");
const PLUGIN_DIR = path.join(__dirname, "plugins");

const app = express();

app.get("/", (_, res) => {
  res.send("SIMI MD is running ❤️");
});

app.get("/health", (_, res) => {
  res.json({ status: "online", bot: config.BOT_NAME });
});

app.listen(config.PORT, "0.0.0.0", () => {
  console.log(`SIMI MD server started on ${config.PORT}`);
});

const logger = P({ level: "silent" });
const plugins = new Map();

async function loadPlugins() {
  plugins.clear();

  const files = fs.readdirSync(PLUGIN_DIR)
    .filter(file => file.endsWith(".js"));

  for (const file of files) {
    try {
      const url = pathToFileURL(path.join(PLUGIN_DIR, file));
      const plugin = await import(url.href);

      if (plugin.default?.command && plugin.default?.run) {
        plugins.set(plugin.default.command, plugin.default);
        console.log(`Loaded: ${file}`);
      }
    } catch (error) {
      console.error(`Plugin error ${file}:`, error.message);
    }
  }
}

function askPhone() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question("Enter WhatsApp number with country code: ", number => {
      rl.close();
      resolve(number.replace(/\D/g, ""));
    });
  });
}

let starting = false;
let reconnectTimer;
let reconnectDelay = 3000;
let currentSocket;

async function startBot() {
  if (starting) return;
  starting = true;

  try {
    fs.mkdirSync(AUTH_DIR, { recursive: true });

    const { state, saveCreds } =
      await useMultiFileAuthState(AUTH_DIR);

    const sock = makeWASocket({
      auth: state,
      logger,
      browser: ["SIMI MD", "Chrome", "1.0.0"],
      markOnlineOnConnect: false,
      syncFullHistory: false
    });

    currentSocket = sock;

    sock.ev.on("creds.update", saveCreds);

    await loadPlugins();

    if (!state.creds.registered) {
      let number = config.PHONE_NUMBER;

      if (!number && process.stdin.isTTY) {
        number = await askPhone();
      }

      if (!number || !/^\d{10,15}$/.test(number)) {
        throw new Error(
          "Set PHONE_NUMBER in Koyeb environment variables."
        );
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      const code = await sock.requestPairingCode(number);

      console.log("--------------------------------");
      console.log("SIMI MD PAIRING CODE:", code);
      console.log("Enter it in WhatsApp > Linked Devices");
      console.log("--------------------------------");
    }

    sock.ev.on("connection.update", update => {
      const { connection, lastDisconnect } = update;

      if (connection === "connecting") {
        console.log("Connecting to WhatsApp...");
      }

      if (connection === "open") {
        reconnectDelay = 3000;
        console.log("SIMI MD CONNECTED ❤️");
        console.log("OWNER:", config.OWNER_NAME);
      }

      if (connection === "close") {
        const status = new Boom(
          lastDisconnect?.error
        ).output.statusCode;

        console.log("Connection closed:", status);

        starting = false;

        if (status === DisconnectReason.loggedOut) {
          console.log("Logged out. New pairing is required.");
          return;
        }

        if (reconnectTimer) clearTimeout(reconnectTimer);

        reconnectTimer = setTimeout(() => {
          startBot().catch(console.error);
        }, reconnectDelay);

        reconnectDelay = Math.min(reconnectDelay * 2, 60000);
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;

      for (const msg of messages) {
        try {
          if (!msg.message || msg.key.fromMe) continue;

          const jid = msg.key.remoteJid;

          if (!jid || jid === "status@broadcast") continue;

          const body =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            "";

          if (!body.startsWith(config.PREFIX)) continue;

          const parts = body.slice(config.PREFIX.length)
            .trim().split(/\s+/);

          const command = parts.shift()?.toLowerCase();
          const query = parts.join(" ");

          const plugin = plugins.get(command);
          if (!plugin) continue;

          await plugin.run({
            sock,
            msg,
            jid,
            args: parts,
            query,
            config
          });

        } catch (error) {
          console.error("Message error:", error);
        }
      }
    });

  } catch (error) {
    console.error("Startup error:", error);
    starting = false;

    if (reconnectTimer) clearTimeout(reconnectTimer);

    reconnectTimer = setTimeout(() => {
      startBot().catch(console.error);
    }, reconnectDelay);

    reconnectDelay = Math.min(reconnectDelay * 2, 60000);
  }
}

process.on("SIGTERM", async () => {
  console.log("SIMI MD shutting down...");
  try {
    currentSocket?.end(undefined);
  } catch {}
  process.exit(0);
});

startBot().catch(console.error);


