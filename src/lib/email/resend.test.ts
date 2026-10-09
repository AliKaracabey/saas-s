import { describe, expect, it, vi } from "vitest";
import { sendWithResend } from "./resend";

const email = { to: "ali@ornek.com", subject: "Merhaba", text: "Selam" };
const config = { apiKey: "re_test_123", from: "saas-s <bildirim@ornek.com>" };

describe("sendWithResend", () => {
  it("Resend API'sine doğru isteği atar", async () => {
    const fetchFn = vi.fn(async () => new Response("{}", { status: 200 }));
    await sendWithResend(email, config, fetchFn);

    expect(fetchFn).toHaveBeenCalledOnce();
    const [url, init] = fetchFn.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer re_test_123",
    });
    expect(JSON.parse(init.body as string)).toEqual({
      from: config.from,
      to: ["ali@ornek.com"],
      subject: "Merhaba",
      text: "Selam",
    });
  });

  it("Resend hata dönerse sebebiyle birlikte hata fırlatır", async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response('{"message":"domain is not verified"}', { status: 403 }),
    );
    await expect(sendWithResend(email, config, fetchFn)).rejects.toThrow(
      /403.*domain is not verified/,
    );
  });
});
