import { json, isAuthed, imageStore } from "./_lib.mjs";

export default async (req, context) => {
  const store = imageStore();

  if (req.method === "GET") {
    const key = context.params?.key;
    const entry = await store.getWithMetadata(key, { type: "arrayBuffer" });
    if (!entry) return new Response("Not found", { status: 404 });
    return new Response(entry.data, {
      headers: {
        "content-type": entry.metadata?.type || "image/jpeg",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  }

  if (req.method === "POST") {
    if (!await isAuthed(req)) return json({ error: "Unauthorized" }, 401);
    const type = req.headers.get("content-type") || "";
    if (!type.startsWith("image/")) return json({ error: "Images only" }, 400);
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 5 * 1024 * 1024) return json({ error: "Image too large (max 5MB)" }, 413);
    const key = crypto.randomUUID();
    await store.set(key, buf, { metadata: { type } });
    return json({ url: `/api/image/${key}` });
  }
  return json({ error: "Method not allowed" }, 405);
};
export const config = { path: ["/api/image", "/api/image/:key"] };
