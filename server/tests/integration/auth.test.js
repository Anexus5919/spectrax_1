const path = require("path");
const { io: ioClient } = require("socket.io-client");

function clearSrcCache() {
  const srcDir = path.resolve(__dirname, "../../src");
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(srcDir)) {
      delete require.cache[key];
    }
  }
}

describe("socket auth", () => {
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

  afterEach(() => {
    clearSrcCache();
    delete process.env.SOCKET_AUTH_TOKEN;
    if (ORIGINAL_NODE_ENV === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = ORIGINAL_NODE_ENV;
    }
  });

  it("rejects connection when auth token is required but not provided", async () => {
    process.env.SOCKET_AUTH_TOKEN = "test-secret";
    const { createServer } = require("../../src/app/createServer");

    const runtime = createServer({
      port: 0,
      logger: { info() {}, error() {} },
    });

    await runtime.start();
    const address = runtime.server.address();

    const client = ioClient(`ws://127.0.0.1:${address.port}`, {
      transports: ["websocket"],
    });

    const error = await new Promise((resolve) => {
      client.on("connect_error", resolve);
    });

    expect(error.message).toBe(
      "Authentication failed: invalid or missing token",
    );

    client.close();
    await runtime.shutdown();
  });

  it("accepts connection with valid auth token", async () => {
    process.env.SOCKET_AUTH_TOKEN = "test-secret";
    const { createServer } = require("../../src/app/createServer");

    const runtime = createServer({
      port: 0,
      logger: { info() {}, error() {} },
    });

    await runtime.start();
    const address = runtime.server.address();

    const client = ioClient(`ws://127.0.0.1:${address.port}`, {
      transports: ["websocket"],
      auth: { token: "test-secret" },
    });

    await new Promise((resolve, reject) => {
      client.on("connect", resolve);
      client.on("connect_error", reject);
    });

    client.close();
    await runtime.shutdown();
  });

  it("connects without auth when SOCKET_AUTH_TOKEN is not set", async () => {
    delete process.env.SOCKET_AUTH_TOKEN;
    process.env.NODE_ENV = "development";
    const { createServer } = require("../../src/app/createServer");

    const runtime = createServer({
      port: 0,
      logger: { info() {}, error() {} },
    });

    await runtime.start();
    const address = runtime.server.address();

    const client = ioClient(`ws://127.0.0.1:${address.port}`, {
      transports: ["websocket"],
    });

    await new Promise((resolve, reject) => {
      client.on("connect", resolve);
      client.on("connect_error", reject);
    });

    client.close();
    await runtime.shutdown();
  });

  it("rejects connection in production when SOCKET_AUTH_TOKEN is not set", async () => {
    delete process.env.SOCKET_AUTH_TOKEN;
    process.env.NODE_ENV = "production";
    const { createServer } = require("../../src/app/createServer");

    const runtime = createServer({
      port: 0,
      logger: { info() {}, error() {} },
    });

    await runtime.start();
    const address = runtime.server.address();

    const client = ioClient(`ws://127.0.0.1:${address.port}`, {
      transports: ["websocket"],
    });

    const error = await new Promise((resolve, reject) => {
      client.on("connect_error", resolve);
      client.on("connect", () =>
        reject(new Error("expected rejection but the client connected")),
      );
    });

    expect(error.message).toBe(
      "Server misconfiguration: SOCKET_AUTH_TOKEN is not set",
    );

    client.close();
    await runtime.shutdown();
  });

  it("rejects connection when SOCKET_AUTH_TOKEN and NODE_ENV are both unset", async () => {
    delete process.env.SOCKET_AUTH_TOKEN;
    delete process.env.NODE_ENV;
    const { createServer } = require("../../src/app/createServer");

    const runtime = createServer({
      port: 0,
      logger: { info() {}, error() {} },
    });

    await runtime.start();
    const address = runtime.server.address();

    const client = ioClient(`ws://127.0.0.1:${address.port}`, {
      transports: ["websocket"],
    });

    const error = await new Promise((resolve, reject) => {
      client.on("connect_error", resolve);
      client.on("connect", () =>
        reject(new Error("expected rejection but the client connected")),
      );
    });

    expect(error.message).toBe(
      "Server misconfiguration: SOCKET_AUTH_TOKEN is not set",
    );

    client.close();
    await runtime.shutdown();
  });
});
