import { BadRequestException, ConflictException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { normalizeException } from "./api-exception.filter";

describe("normalizeException", () => {
  it("preserves stable validation errors", () => {
    const normalized = normalizeException(
      new BadRequestException({
        statusCode: 400,
        error: "VALIDATION_ERROR",
        message: "Validation failed",
        issues: [
          {
            path: "email",
            message: "Enter a valid email address.",
            code: "invalid_string",
          },
        ],
      }),
    );

    expect(normalized).toMatchObject({
      statusCode: 400,
      error: "VALIDATION_ERROR",
      message: "Validation failed",
      issues: [
        {
          path: "email",
          message: "Enter a valid email address.",
          code: "invalid_string",
        },
      ],
      logInternal: false,
    });
  });

  it("maps regular Nest exceptions to application error codes", () => {
    expect(
      normalizeException(new ConflictException("Email is taken")),
    ).toMatchObject({
      statusCode: 409,
      error: "CONFLICT",
      message: "Email is taken",
      logInternal: false,
    });
  });

  it("maps Prisma unique constraint failures to conflict", () => {
    expect(
      normalizeException({ code: "P2002", meta: { target: ["email"] } }),
    ).toMatchObject({
      statusCode: 409,
      error: "CONFLICT",
      message: "Resource already exists.",
      logInternal: false,
    });
  });

  it("hides unknown internal errors from API responses", () => {
    expect(
      normalizeException(new Error("database password leaked")),
    ).toMatchObject({
      statusCode: 500,
      error: "INTERNAL_ERROR",
      message: "Internal server error.",
      logInternal: true,
    });
  });
});
