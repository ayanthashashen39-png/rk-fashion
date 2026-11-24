import { json, isAuthed, loadProducts, saveProducts, imageStore } from "./_lib.mjs";

const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

const clean = (p) => {
  const images = (Array.isArray(p.images) && p.images.length ? p.images : [p.image]).filter(Boolean).slice(0, 5).map(String);
  const sale = num(p.salePrice);
  const stock = num(p.stock);
  return {
    id: p.id,
    name: String(p.name || "").slice(0, 120),
    price: Number(p.price) || 0,
    salePrice: sale && sale > 0 ? sale : null,
    category: String(p.category || "Uncategorised").slice(0, 60),
    gender: ["women", "men", "unisex"].includes(p.gender) ? p.gender : "unisex",
    colors: Array.isArray(p.colors) ? p.colors.slice(0, 8).map(String) : [],
    sizes: Array.isArray(p.sizes) ? p.sizes.slice(0, 12).map((s) => String(s).slice(0, 12)) : [],
    stock: stock === null || Number.isNaN(stock) ? null : Math.max(0, Math.floor(stock)),
    image: images[0] || "",
    images,
    description: String(p.description || "").slice(0, 1000),
    isNew: !!p.isNew,
    published: p.published !== false,
  };
};

export default async (req, context) => {
  const id = context.params?.id;
  let list = await loadProducts();

  if (req.method === "GET") {
    return json(await isAuthed(req) ? list : list.filter((p) => p.published));
  }
  if (!await isAuthed(req)) return json({ error: "Unauthorized" }, 401);

  if (req.method === "POST") {
    const body = clean(await req.json());
    if (!body.name) return json({ error: "Name required" }, 400);
    body.id = crypto.randomUUID();
    list.unshift(body);
    await saveProducts(list);
    return json(body, 201);
  }

  if (req.method === "PUT" && id) {
    const i = list.findIndex((p) => p.id === id);
    if (i < 0) return json({ error: "Not found" }, 404);
    list[i] = { ...clean(await req.json()), id };
    await saveProducts(list);
    return json(list[i]);
  }

  if (req.method === "DELETE" && id) {
    const item = list.find((p) => p.id === id);
    list = list.filter((p) => p.id !== id);
    await saveProducts(list);
    for (const u of item?.images || []) {
      if (u.startsWith("/api/image/")) await imageStore().delete(u.replace("/api/image/", "")).catch(() => {});
    }
    return json({ ok: true });
  }
  return json({ error: "Method not allowed" }, 405);
};
export const config = { path: ["/api/products", "/api/products/:id"] };
