import { describe, expect, it } from "vitest";
import { HealthController } from "./health.controller";

/**
 * Smoke tests for the public health endpoint. Add tests for new controllers
 * alongside their source file as `<name>.test.ts`. Vitest auto-discovers via
 * `src/**\/*.{test,spec}.ts` (see vitest.config.ts).
 */
describe("HealthController", () => {
  const controller = new HealthController({} as never, {
    enqueueHealthCheck: async () => ({ id: "test-job" }),
  } as never);

  it("returns ok status", () => {
    const result = controller.health();
    expect(result.status).toBe("ok");
    expect(result.service).toContain("backend");
    expect(result.uptime).toBeGreaterThanOrEqual(0);
  });

  it("reports the project name", () => {
    const result = controller.health();
    expect(result.service).toBe("playcode-bouncebacktalk-app-backend");
  });

  it("enqueues a queue health check", async () => {
    const result = await controller.queueCheck();
    expect(result.queue).toBe("ok");
    expect(result.jobId).toBe("test-job");
  });

  it("reports readiness when database and queue are available", async () => {
    const readyController = new HealthController(
      {
        $queryRaw: async () => [{ ok: 1 }],
      } as never,
      {
        enqueueHealthCheck: async () => ({ id: "ready-job" }),
      } as never,
    );

    await expect(readyController.ready()).resolves.toMatchObject({
      status: "ready",
      checks: {
        db: { status: "ok" },
        queue: { status: "ok", jobId: "ready-job" },
      },
    });
  });

  it("fails readiness when a dependency is unavailable", async () => {
    const readyController = new HealthController(
      {
        $queryRaw: async () => {
          throw new Error("database unavailable");
        },
      } as never,
      {
        enqueueHealthCheck: async () => ({ id: "ready-job" }),
      } as never,
    );

    await expect(readyController.ready()).rejects.toThrow(
      "Service dependencies are not ready.",
    );
  });
});
