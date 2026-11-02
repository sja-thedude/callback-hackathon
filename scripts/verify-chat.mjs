import fs from "node:fs";
import { action } from "./automation-client.mjs";
const status = await action("/api/automation/status");
if (!status.ready || status.user.login !== "sjathedude") throw new Error("Authorize the expected owner before verifying real chat.");
const socket = new WebSocket("wss://eventsub.wss.twitch.tv/ws");
const messages = [];
let resolveWelcome, rejectWelcome;
const welcome = new Promise((resolve, reject) => { resolveWelcome = resolve; rejectWelcome = reject; });
const timeout = setTimeout(() => rejectWelcome(new Error("Twitch chat welcome timed out.")), 15000);
socket.addEventListener("error", () => rejectWelcome(new Error("Twitch chat connection failed.")));
socket.addEventListener("message", (event) => {
  try {
    const packet = JSON.parse(event.data);
    if (packet.metadata?.message_type === "session_welcome") resolveWelcome(packet.payload.session.id);
    if (packet.metadata?.message_type === "notification") messages.push(packet.payload.event);
  } catch { rejectWelcome(new Error("Twitch returned an invalid chat packet.")); }
});
try {
  const sessionId = await welcome;
  clearTimeout(timeout);
  const subscription = await action("/api/eventsub", { sessionId });
  if (!subscription.connected) throw new Error("The real EventSub subscription was not established.");
  const sent = await action("/api/automation/chat", { nearMiss: true });
  if (!sent.sent) throw new Error("Twitch did not confirm delivery of the chat verification message.");
  let received = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    received = messages.some((message) => message.chatter_user_id === status.user.id && message.message?.text === sent.message);
    if (received) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!received) throw new Error("The sent owner message was not received through real EventSub.");
  fs.writeFileSync("docs/CHAT_VERIFICATION.json", JSON.stringify({ verifiedAt: new Date().toISOString(), channel: status.user.login, transport: "real EventSub WebSocket", authenticatedSubscription: true, sendConfirmedByTwitch: true, ownerMessageReceived: true, callbackRetrieval: "pending indexed clips" }, null, 2) + "\n");
  console.log("PASS actual Twitch authorization, EventSub subscription, confirmed chat send, and receipt of the same owner message. No simulated chatters or tokens were used in the report.");
} finally {
  clearTimeout(timeout);
  socket.close();
}
