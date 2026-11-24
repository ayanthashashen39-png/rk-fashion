import { json, isAuthed, orderStore, loadProducts, saveProducts } from "./_lib.mjs";

const s = (v, n) => String(v ?? "").trim().slice(0, n);
const STATUSES = ["new", "confirmed", "shipped", "done", "cancelled"];

export default async (req, context) => {
  const store = orderStore();
  const id = context.params?.id;

  // Public: a customer places an order (no payment, the shop contacts them)
  if (req.method === "POST") {
    const b = await req.json().catch(() => ({}));
    if (b.website) return json({ ok: true }); // honeypot
    const name = s(b.name, 80), phone = s(b.phone, 30);
    if (!name || !phone) return json({ error: "Name and phone are required" }, 400);
    const asked = Array.isArray(b.items) ? b.items.slice(0, 30) : [];
    if (!asked.length) return json({ error: "Your bag is empty" }, 400);

    const products = await loadProducts();
    const items = [];
    for (const it of asked) {
      const p = products.find((x) => x.id === it.id && x.published);
      const qty = Math.min(20, Math.max(1, parseInt(it.qty, 10) || 1));
      if (!p) return json({ error: "A product in your bag is no longer available" }, 409);
      if (p.stock !== null && p.stock !== undefined && qty > p.stock)
        return json({ error: p.stock === 0 ? `${p.name} is sold out` : `Only ${p.stock} left of ${p.name}` }, 409);
      const price = p.salePrice && p.salePrice < p.price ? p.salePrice : p.price;
      items.push({ id: p.id, name: p.name, size: s(it.size, 12), qty, price });
    }
    // reduce stock for tracked products
    for (const it of items) {
      const p = products.find((x) => x.id === it.id);
      if (p.stock !== null && p.stock !== undefined) p.stock = Math.max(0, p.stock - it.qty);
    }
    await saveProducts(products);

    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const order = {
      id: key,
      createdAt: new Date().toISOString(),
      name, phone,
      address: s(b.address, 300),
      note: s(b.note, 300),
      items,
      total: items.reduce((t, i) => t + i.price * i.qty, 0),
      status: "new",
    };
    await store.setJSON(key, order);
    return json(order, 201);
  }

  if (!await isAuthed(req)) return json({ error: "Unauthorized" }, 401);

  if (req.method === "GET") {
    const { blobs } = await store.list();
    const all = await Promise.all(blobs.map((x) => store.get(x.key, { type: "json" })));
    return json(all.filter(Boolean).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
  }
  if (req.method === "PUT" && id) {
    const order = await store.get(id, { type: "json" });
    if (!order) return json({ error: "Not found" }, 404);
    const { status } = await req.json();
    if (!STATUSES.includes(status)) return json({ error: "Bad status" }, 400);
    order.status = status;
    await store.setJSON(id, order);
    return json(order);
  }
  if (req.method === "DELETE" && id) {
    await store.delete(id);
    return json({ ok: true });
  }
  return json({ error: "Method not allowed" }, 405);
};
export const config = { path: ["/api/orders", "/api/orders/:id"] };
