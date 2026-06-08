import {
  BadRequestException,
  ValidationPipe,
  type INestApplication,
  type ValidationError,
} from "@nestjs/common";
import cookieParser from "cookie-parser";
import type { ApiIssue } from "./common/api-issue";

/**
 * Shared HTTP setup for production boot and e2e tests.
 *
 * Keep middleware, the global prefix, and the validation pipe here so tests
 * exercise the same request shape as `src/main.ts`.
 */
export function configureApp(app: INestApplication): void {
  app.use(cookieParser());
  app.setGlobalPrefix("api");

  // Standard NestJS validation: DTO classes + class-validator decorators.
  // `whitelist` strips unknown keys (matching the old Zod objects); `transform`
  // turns plain payloads into DTO instances and coerces @Type() fields. The
  // exceptionFactory keeps the API error envelope identical to before, so the
  // frontend's ApiError parsing (issues / fieldErrors) is unaffected.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          statusCode: 400,
          error: "VALIDATION_ERROR",
          message: "Validation failed",
          issues: flattenValidationErrors(errors),
        }),
    }),
  );
}

/** Flatten class-validator errors (incl. nested children) into stable issues. */
function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = "",
): ApiIssue[] {
  const issues: ApiIssue[] = [];
  for (const error of errors) {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    if (error.constraints) {
      for (const [code, message] of Object.entries(error.constraints)) {
        issues.push({ path, message, code });
      }
    }
    if (error.children?.length) {
      issues.push(...flattenValidationErrors(error.children, path));
    }
  }
  return issues;
}
