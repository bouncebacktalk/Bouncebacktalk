import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api";
import { AuthForm } from "./AuthForm";

const mocks = vi.hoisted(() => ({
  authClient: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
}));

vi.mock("../auth", () => ({
  authClient: mocks.authClient,
}));

describe("AuthForm", () => {
  it("renders field-level validation errors from the API", async () => {
    mocks.authClient.register.mockRejectedValueOnce(
      new ApiError(400, "Validation failed", {
        statusCode: 400,
        error: "VALIDATION_ERROR",
        message: "Validation failed",
        issues: [
          {
            path: "email",
            message: "Enter a valid email address.",
            code: "invalid_string",
          },
          {
            path: "password",
            message: "Use at least 8 characters.",
            code: "too_small",
          },
        ],
      }),
    );

    const { container } = render(<AuthForm mode="register" />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "bad@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "short-pass" },
    });
    fireEvent.submit(container.querySelector("form")!);

    expect(
      await screen.findByText("Enter a valid email address."),
    ).toBeTruthy();
    expect(screen.getByText("Use at least 8 characters.")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(
      "Please fix the highlighted fields.",
    );
  });
});
