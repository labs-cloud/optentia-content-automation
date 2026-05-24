import { Resend } from "resend";
import { ENV } from "./env";

export type NotificationPayload = {
  title: string;
  content: string;
};

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(ENV.resendApiKey);
  return _resend;
}

export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  if (!ENV.resendApiKey || !ENV.ownerEmail) {
    console.log(`[Notification] ${payload.title}: ${payload.content}`);
    return true;
  }

  try {
    await getResend().emails.send({
      from: "notifications@optentia.com",
      to: ENV.ownerEmail,
      subject: payload.title,
      text: payload.content,
    });
    return true;
  } catch (error) {
    console.warn("[Notification] Failed to send email:", error);
    return false;
  }
}
