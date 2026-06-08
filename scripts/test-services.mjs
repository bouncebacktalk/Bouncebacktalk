#!/usr/bin/env node
import { createServer } from "node:net";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = resolve(rootDir, "temp", "test-services");
const args = new Set(process.argv.slice(2));
const backendE2EOnly = args.has("--backend-e2e-only");

loadEnvFiles([
  resolve(rootDir, ".env.test.local"),
  resolve(rootDir, ".env.test"),
  resolve(rootDir, ".env.local"),
]);

process.env.NODE_ENV = "test";

const databaseUrl = requiredEnv("DATABASE_URL");
const redisUrl = requiredEnv("REDIS_URL");
const pgUrl = new URL(databaseUrl);
const redis = new URL(redisUrl);
const pgPort = Number(pgUrl.port || 5432);
const redisPort = Number(redis.port || 6379);
const children = [];
let postgresStarted = false;

process.on("SIGINT", async () => {
  await cleanup();
  process.exit(130);
});
process.on("SIGTERM", async () => {
  await cleanup();
  process.exit(143);
});

try {
  await ensureCommand("pnpm");
  await ensurePostgres();
  await ensureRedis();

  await run("pnpm", ["--dir", "backend-nest", "prisma:migrate:deploy"]);

  if (!backendE2EOnly) {
    await run("pnpm", ["--dir", "backend-nest", "test"]);
    await run("pnpm", ["--dir", "frontend", "test"]);
  }

  await run("pnpm", ["--dir", "backend-nest", "test:e2e"]);
} finally {
  await cleanup();
}

async function ensurePostgres() {
  await ensureCommand("initdb");
  await ensureCommand("pg_ctl");
  await ensureCommand("dropdb");
  await ensureCommand("createdb");
  await ensurePortFree(pgPort, "Postgres", "DATABASE_URL");

  const dataDir = resolve(tempDir, "postgres");
  const logPath = resolve(tempDir, "postgres.log");
  mkdirSync(tempDir, { recursive: true });

  if (!existsSync(resolve(dataDir, "PG_VERSION"))) {
    await run("initdb", ["-D", dataDir, "-A", "trust", "-U", pgUser()]);
  }

  await run("pg_ctl", [
    "-D",
    dataDir,
    "-l",
    logPath,
    "-o",
    `-F -p ${pgPort} -h ${pgUrl.hostname}`,
    "start",
  ]);
  postgresStarted = true;
  await waitForPort(pgUrl.hostname, pgPort, "Postgres");

  const pgEnv = {
    ...process.env,
    PGPASSWORD: decodeURIComponent(pgUrl.password),
  };
  await run(
    "dropdb",
    [
      "--if-exists",
      "-h",
      pgUrl.hostname,
      "-p",
      String(pgPort),
      "-U",
      pgUser(),
      pgDatabase(),
    ],
    pgEnv,
  );
  await run(
    "createdb",
    ["-h", pgUrl.hostname, "-p", String(pgPort), "-U", pgUser(), pgDatabase()],
    pgEnv,
  );
}

async function ensureRedis() {
  await ensureCommand("redis-server");
  await ensurePortFree(redisPort, "Redis", "REDIS_URL");

  const redisDir = resolve(tempDir, "redis");
  mkdirSync(redisDir, { recursive: true });
  const log = createWriteStream(resolve(tempDir, "redis.log"), { flags: "a" });
  const child = spawn(
    "redis-server",
    [
      "--bind",
      redis.hostname,
      "--port",
      String(redisPort),
      "--save",
      "",
      "--appendonly",
      "no",
      "--dir",
      redisDir,
    ],
    {
      cwd: rootDir,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  children.push(child);
  await waitForPort(redis.hostname, redisPort, "Redis");
}

async function cleanup() {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  if (postgresStarted) {
    await run("pg_ctl", [
      "-D",
      resolve(tempDir, "postgres"),
      "-m",
      "fast",
      "stop",
    ]).catch(() => undefined);
  }
  rmSync(tempDir, { recursive: true, force: true });
}

async function ensureCommand(command) {
  await run(command, ["--version"], process.env, { quiet: true }).catch(() => {
    throw new Error(
      `Missing command: ${command}. Install Postgres/Redis locally, or set DATABASE_URL and REDIS_URL to running test services in .env.test.local.`,
    );
  });
}

async function ensurePortFree(port, service, envName) {
  const free = await isPortFree(port);
  if (free) return;
  throw new Error(
    `${service} test port ${port} is already in use. Stop that service or override ${envName} in .env.test.local.`,
  );
}

async function waitForPort(host, port, label) {
  const deadline = Date.now() + 15_000;
  return pollPort(host, port, label, deadline);
}

async function pollPort(host, port, label, deadline) {
  if (Date.now() >= deadline) {
    throw new Error(`${label} did not start on ${host}:${port} within 15s.`);
  }
  if (!(await isPortFree(port, host))) return;
  await sleep(150);
  return pollPort(host, port, label, deadline);
}

async function isPortFree(port, host = "127.0.0.1") {
  return new Promise((resolvePort) => {
    const server = createServer();
    server.once("error", () => resolvePort(false));
    server.once("listening", () => {
      server.close(() => resolvePort(true));
    });
    server.listen(port, host);
  });
}

function run(command, commandArgs, env = process.env, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, commandArgs, {
      cwd: rootDir,
      env,
      stdio: options.quiet ? "ignore" : "inherit",
    });
    child.on("error", rejectRun);
    child.on("exit", (code) => {
      if (code === 0) {
        resolveRun();
        return;
      }
      rejectRun(
        new Error(`${command} ${commandArgs.join(" ")} exited with ${code}`),
      );
    });
  });
}

function pgUser() {
  return decodeURIComponent(pgUrl.username || "postgres");
}

function pgDatabase() {
  return decodeURIComponent(pgUrl.pathname.replace(/^\//, ""));
}

function requiredEnv(name) {
  const value = process.env[name];
  if (value) return value;
  throw new Error(
    `${name} is required. Add it to .env.test or .env.test.local.`,
  );
}

function loadEnvFiles(paths) {
  for (const path of paths) {
    if (!existsSync(path)) continue;
    const content = readFileSync(path, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = unquote(trimmed.slice(index + 1).trim());
      process.env[key] ??= value;
    }
  }
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}
