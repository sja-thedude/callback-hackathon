import { createHash, randomUUID } from "node:crypto";
export async function connectOBS({ port, password }) {
  const socket = new WebSocket("ws://127.0.0.1:" + port);
  const pending = new Map();
  let readyResolve, readyReject;
  const ready = new Promise((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  const timeout = setTimeout(
    () => readyReject(new Error("OBS control did not become ready.")),
    15000,
  );
  socket.addEventListener("error", () =>
    readyReject(new Error("OBS WebSocket is unavailable.")),
  );
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.op === 0) {
      const auth = message.d.authentication;
      const data = { rpcVersion: 1, eventSubscriptions: 0 };
      if (auth) {
        const secret = createHash("sha256")
          .update(password + auth.salt)
          .digest("base64");
        data.authentication = createHash("sha256")
          .update(secret + auth.challenge)
          .digest("base64");
      }
      socket.send(JSON.stringify({ op: 1, d: data }));
    }
    if (message.op === 2) {
      clearTimeout(timeout);
      readyResolve();
    }
    if (message.op === 7) {
      const waiter = pending.get(message.d.requestId);
      if (!waiter) return;
      pending.delete(message.d.requestId);
      clearTimeout(waiter.timeout);
      if (message.d.requestStatus.result)
        waiter.resolve(message.d.responseData || {});
      else
        waiter.reject(
          new Error(
            message.d.requestType +
              ": " +
              (message.d.requestStatus.comment || message.d.requestStatus.code),
          ),
        );
    }
  });
  await ready;
  return {
    async call(requestType, requestData = {}) {
      const requestId = randomUUID();
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending.delete(requestId);
          reject(new Error("OBS request timed out: " + requestType));
        }, 15000);
        pending.set(requestId, { resolve, reject, timeout });
        socket.send(
          JSON.stringify({ op: 6, d: { requestType, requestId, requestData } }),
        );
      });
    },
    close() {
      socket.close();
    },
  };
}
