import { Injectable } from "@nestjs/common";
import * as React from "react";
import {
  Head,
  Html,
  Preview,
  Tailwind,
  pixelBasedPreset,
  render,
} from "react-email";
import type { EmailMessage } from "./interfaces";
import type { LeadNotificationEmailJob } from "../queue/email-job.types";

export interface PasswordResetTemplateInput {
  to: string;
  appName: string;
  resetUrl: string;
  expiresIn: string;
}

@Injectable()
export class EmailTemplateService {
  async passwordReset(
    input: PasswordResetTemplateInput,
  ): Promise<EmailMessage> {
    const element = React.createElement(PasswordResetEmail, input);
    const [html, text] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
    ]);

    return {
      to: input.to,
      subject: `Reset your ${input.appName} password`,
      html,
      text,
    };
  }

  async leadNotification(
    input: LeadNotificationEmailJob,
  ): Promise<EmailMessage> {
    const element = React.createElement(LeadNotificationEmail, input);
    const [html, text] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
    ]);

    return {
      to: input.to,
      replyTo: input.email,
      subject: `New contact from ${input.appName}`,
      html,
      text,
      headers: {
        "X-Entity-Type": "lead",
        "X-Entity-ID": String(input.leadId),
      },
    };
  }
}

const emailTailwindConfig = {
  presets: [pixelBasedPreset],
  theme: {
    extend: {},
  },
};

const EmailTailwind = Tailwind as React.ComponentType<
  React.PropsWithChildren<{ config: typeof emailTailwindConfig }>
>;

function PasswordResetEmail(props: PasswordResetTemplateInput) {
  return React.createElement(
    Html,
    null,
    React.createElement(Head),
    React.createElement(Preview, null, `Reset your ${props.appName} password`),
    React.createElement(
      EmailTailwind,
      { config: emailTailwindConfig },
      React.createElement(
        "body",
        { className: "m-0 bg-slate-100 font-sans" },
        React.createElement(
          "main",
          { className: "mx-auto w-full max-w-xl bg-white px-6 py-8" },
          React.createElement(
            "h1",
            {
              className: "m-0 mb-4 text-2xl font-bold leading-8 text-slate-950",
            },
            "Reset your password",
          ),
          React.createElement(
            "p",
            { className: "m-0 mb-4 text-base leading-6 text-slate-700" },
            `Someone requested a password reset for ${props.appName}.`,
          ),
          React.createElement(
            "p",
            { className: "m-0 mb-4 text-base leading-6 text-slate-700" },
            `Use the link below to set a new password. This link expires in ${props.expiresIn}.`,
          ),
          React.createElement(
            "div",
            { className: "my-7" },
            React.createElement(
              "a",
              {
                href: props.resetUrl,
                className:
                  "inline-block rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white no-underline",
              },
              "Reset password",
            ),
          ),
          React.createElement(
            "p",
            { className: "m-0 mb-4 text-sm leading-6 text-slate-500" },
            "If you didn't request this, you can safely ignore this email.",
          ),
          React.createElement("hr", {
            className: "my-6 border border-solid border-slate-200",
          }),
          React.createElement(
            "p",
            { className: "m-0 text-xs leading-5 text-slate-400" },
            `This email was sent by ${props.appName}.`,
          ),
        ),
      ),
    ),
  );
}

function LeadNotificationEmail(props: LeadNotificationEmailJob) {
  const sender = props.name ? `${props.name} <${props.email}>` : props.email;
  const company = props.company ? `Company: ${props.company}` : "";

  return React.createElement(
    Html,
    null,
    React.createElement(Head),
    React.createElement(Preview, null, `New contact from ${sender}`),
    React.createElement(
      EmailTailwind,
      { config: emailTailwindConfig },
      React.createElement(
        "body",
        { className: "m-0 bg-slate-100 font-sans" },
        React.createElement(
          "main",
          { className: "mx-auto w-full max-w-xl bg-white px-6 py-8" },
          React.createElement(
            "p",
            {
              className:
                "m-0 mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500",
            },
            `Lead #${props.leadId} from ${props.source}`,
          ),
          React.createElement(
            "h1",
            {
              className: "m-0 mb-4 text-2xl font-bold leading-8 text-slate-950",
            },
            "New contact form submission",
          ),
          React.createElement(
            "p",
            { className: "m-0 mb-2 text-base leading-6 text-slate-700" },
            `From: ${sender}`,
          ),
          company
            ? React.createElement(
                "p",
                { className: "m-0 mb-2 text-base leading-6 text-slate-700" },
                company,
              )
            : null,
          React.createElement(
            "p",
            { className: "m-0 mb-5 text-sm leading-6 text-slate-500" },
            `Received at ${props.receivedAt}. Status: ${props.status}.`,
          ),
          React.createElement(
            "div",
            {
              className:
                "rounded-md border border-solid border-slate-200 bg-slate-50 p-4",
            },
            React.createElement(
              "p",
              {
                className:
                  "m-0 whitespace-pre-wrap text-base leading-7 text-slate-800",
              },
              props.message,
            ),
          ),
          React.createElement("hr", {
            className: "my-6 border border-solid border-slate-200",
          }),
          React.createElement(
            "p",
            { className: "m-0 text-xs leading-5 text-slate-400" },
            `This email was sent by ${props.appName}. Reply directly to contact ${props.email}.`,
          ),
        ),
      ),
    ),
  );
}
