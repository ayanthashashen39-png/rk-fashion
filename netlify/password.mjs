import { json, isAuthed, checkPassword, setPassword, makeToken, resetMode } from "./_lib.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!(await isAuthed(req))) return json({ error: "Unauthorized" }, 401);
  if (resetMode()) return json({ error: "Remove the ADMIN_PASSWORD_RESET variable in Netlify first, then change the password." }, 409);
  const { current, next } = await req.json().catch(() => ({}));
  if (!(await checkPassword(current))) return json({ error: "Current password is wrong · දැනට ඇති මුරපදය වැරදියි" }, 400);
  const pw = String(next ?? "").trim();
  if (pw.length < 8) return json({ error: "New password must be at least 8 characters · අවම වශයෙන් අකුරු 8ක් ඕන" }, 400);
  await setPassword(pw);
  return json({ ok: true, token: await makeToken() }); // old sessions stop working, this one continues
};
export const config = { path: "/api/password" };
