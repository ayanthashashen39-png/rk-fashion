import { json, makeToken, checkPassword, hasAnyPassword } from "./_lib.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!(await hasAnyPassword()))
    return json({ error: "ADMIN_PASSWORD is not set in Netlify (Site settings → Environment variables), then redeploy." }, 500);
  const { password } = await req.json().catch(() => ({}));
  if (!(await checkPassword(password))) return json({ error: "Wrong password · මුරපදය වැරදියි" }, 401);
  return json({ token: await makeToken() });
};
export const config = { path: "/api/login" };
