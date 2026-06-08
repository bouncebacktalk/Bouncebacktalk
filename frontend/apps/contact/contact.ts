import { apiPost } from "../api";

export interface ContactInput {
  name?: string;
  email: string;
  company?: string;
  message: string;
  source?: string;
  website?: string;
}

export interface ContactResponse {
  ok: true;
}

export const contactClient = {
  submit(input: ContactInput): Promise<ContactResponse> {
    return apiPost<ContactResponse>("/leads", input, {
      skipAuthRefresh: true,
    });
  },
};
