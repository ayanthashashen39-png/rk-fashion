import { json, isAuthed, loadSettings, settingsStore } from "./_lib.mjs";

const s = (v, n) => String(v ?? "").slice(0, n);

export default async (req) => {
  if (req.method === "GET") return json(await loadSettings());
  if (!await isAuthed(req)) return json({ error: "Unauthorized" }, 401);
  if (req.method === "PUT") {
    const b = await req.json();
    const next = {
      logo: s(b.logo, 40) || "RK FASHION",
      banner: s(b.banner, 160),
      heroEyebrow: s(b.heroEyebrow, 80),
      heroTitle: s(b.heroTitle, 120),
      heroText: s(b.heroText, 300),
      heroTextSi: s(b.heroTextSi, 300),
      heroImage: s(b.heroImage, 300),
      whatsapp: s(b.whatsapp, 20).replace(/[^\d]/g, ""),
      currency: s(b.currency, 4) || "Rs.",
      categories: Array.isArray(b.categories) ? [...new Set(b.categories.map((c) => s(c, 60).trim()).filter(Boolean))].slice(0, 40) : [],
    };
    await settingsStore().setJSON("main", next);
    return json(next);
  }
  return json({ error: "Method not allowed" }, 405);
};
export const config = { path: "/api/settings" };
