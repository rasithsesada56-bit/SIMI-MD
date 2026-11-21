
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from "@whiskeysockets/baileys";

import { Boom } from "@hapi/boom";
import P from "pino";
import express from "express";
import readline from "node:readline";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import config from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, "auth_info");
const PLUGIN_DIR = path.join(__dirname, "plugins");

const app = express();

app.get("/", (req, res) => {
  res.send("SIMI MD is running!");
});

app.get("/health", (req, res) => {
  res.json({ status: "running", bot: config.BOT_NAME });
});

app.listen(config.PORT, () => {
  console.log(`${config.BOT_NAME} server running on ${config.PORT}`);
});

const logger = P({ level: "silent" });
const plugins = new Map();

async function loadPlugins() {
  plugins.clear();

  const files = fs.readdirSync(PLUGIN_DIR)
    .filter(file => file.endsWith(".js"));

  for (const file of files) {
    try {
      const filePath = pathToFileURL(
        path.join(PLUGIN_DIR, file)
      ).href;

      const plugin = await import(filePath);

      if (plugin.default?.command && plugin.default?.run) {
        plugins.set(plugin.default.command, plugin.default);
        console.log(`Loaded plugin: ${file}`);
      }
    } catch (error) {
      console.error(`Plugin error ${file}:`, error.message);
    }
  }
}

function askPhoneNumber() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question("Enter WhatsApp number (947XXXXXXXX): ", answer => {
      rl.close();
      resolve(answer.trim().replace(/\D/g, ""));
    });
  });
}

let reconnecting = false;
let reconnectDelay = 3000;

async function startBot() {
  if (reconnecting) return;
  reconnecting = true;

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

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async update => {
      const { connection, lastDisconnect } = update;

      if (connection === "connecting") {
        console.log("Connecting to WhatsApp...");
      }

      if (connection === "open") {
        reconnectDelay = 3000;
        console.log("SIMI MD CONNECTED SUCCESSFULLY!");
        console.log("OWNER: " + config.OWNER_NAME);
      }

      if (connection === "close") {
        const status = new Boom(
          lastDisconnect?.error
        ).output?.statusCode;

        if (status === DisconnectReason.loggedOut) {
          console.log("WhatsApp logged out. Fresh pairing required.");
          reconnecting = false;
          return;
        }

        console.log("Connection closed. Reconnecting...");
        reconnecting = false;

        setTimeout(() => {
          startBot().catch(console.error);
        }, reconnectDelay);

        reconnectDelay = Math.min(reconnectDelay * 2, 60000);
      }
    });

    if (!state.creds.registered) {
      const number = await askPhoneNumber();

      if (!/^\d{10,15}$/.test(number)) {
        throw new Error("Invalid phone number.");
      }

      await new Promise(resolve => setTimeout(resolve, 1500));

      const code = await sock.requestPairingCode(number);

      console.log("\n================================");
      console.log("SIMI MD PAIRING CODE:", code);
      console.log("================================");
      console.log("Open WhatsApp > Linked Devices");
      console.log("Choose Link with phone number.");
    }

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;

      for (const msg of messages) {
        try {
          if (!msg.message || msg.key.fromMe) continue;

          const jid = msg.key.remoteJid;
          if (!jid || jid === "status@broadcast") continue;

          const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            "";

          if (!text.startsWith(config.PREFIX)) continue;

          const args = text.slice(config.PREFIX.length)
            .trim().split(/\s+/);

          const command = args.shift()?.toLowerCase();
          const query = args.join(" ");

          const plugin = plugins.get(command);

          if (!plugin) continue;

          await plugin.run({
            sock,
            msg,
            jid,
            args,
            query,
            config
          });

        } catch (error) {
          console.error("Command error:", error);
        }
      }
    });

    await loadPlugins();

  } catch (error) {
    console.error("Bot startup error:", error);
    reconnecting = false;

    setTimeout(() => {
      startBot().catch(console.error);
    }, reconnectDelay);

    reconnectDelay = Math.min(reconnectDelay * 2, 60000);
    return;
  }

  reconnecting = false;
}

startBot().catch(console.error);
