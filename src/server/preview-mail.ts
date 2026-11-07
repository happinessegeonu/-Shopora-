import { database } from "./postgres";
import { assertPreviewIsolation } from "@/lib/preview-mode";
export async function capturePreviewMail(to: string, subject: string, body: string) {
  assertPreviewIsolation();
  await database().query("insert into shopora_preview_messages(recipient,subject,body) values($1,$2,$3)", [to, `[SIMULATED EMAIL] ${subject}`, body]);
}
