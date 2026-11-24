import { createHmac, createHash, scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

/* ---- admin password ----
   1) A password saved from Admin → Settings (stored as a salted hash) wins.
   2) Otherwise the ADMIN_PASSWORD environment variable is used.
   3) Forgot it? Set ADMIN_PASSWORD_RESET=yes in Netlify and redeploy: the saved password is ignored. */
const authStore = () => getStore({ name: "auth", consistency: "strong" });
const envPw = () => (process.env.ADMIN_PASSWORD || "").trim();
export const resetMode = () => process.env.ADMIN_PASSWORD_RESET === "yes";

async function savedAuth() {
  if (resetMode()) return null;
  return (await authStore().get("main", { type: "json" })) || null;
}
const sha = (s) => createHash("sha256").update(String(s)).digest();
async function signingKey() {
  const a = await savedAuth();
  return a ? a.hash : envPw();
}
export async function hasAnyPassword() {
  return !!(await savedAuth()) || !!envPw();
}
export async function checkPassword(pw) {
  pw = String(pw ?? "").trim();
  if (!pw) return false;
  const a = await savedAuth();
  if (a) {
    const h = scryptSync(pw, a.salt, 64);
    return timingSafeEqual(h, Buffer.from(a.hash, "hex"));
  }
  const e = envPw();
  return !!e && timingSafeEqual(sha(pw), sha(e));
}
export async function setPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(String(pw).trim(), salt, 64).toString("hex");
  await authStore().setJSON("main", { salt, hash });
}
export async function makeToken() {
  const exp = Date.now() + 1000 * 60 * 60 * 12; // 12 hours
  const sig = createHmac("sha256", await signingKey()).update(String(exp)).digest("hex");
  return `${exp}.${sig}`;
}
export async function isAuthed(req) {
  const key = await signingKey();
  if (!key) return false;
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = createHmac("sha256", key).update(exp).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(good));
  } catch {
    return false;
  }
}

export const productStore = () => getStore({ name: "products", consistency: "strong" });
export const imageStore = () => getStore({ name: "images", consistency: "strong" });

export const settingsStore = () => getStore({ name: "settings", consistency: "strong" });
export const orderStore = () => getStore({ name: "orders", consistency: "strong" });

export const DEFAULT_SETTINGS = {
  logo: "RK FASHION",
  banner: "Complimentary shipping on all orders over Rs. 10,000",
  heroEyebrow: "Spring / Summer 2024",
  heroTitle: "Timeless Design.\nModern Essence.",
  heroText: "Discover effortless pieces\ncrafted for a life well-lived.",
  heroTextSi: "ජීවිතය ලස්සනට ගත කරන ඔබට, සරලව ලස්සන වන ඇඳුම්.",
  heroImage: "/assets/hero.jpg",
  whatsapp: "94753653318",
  currency: "Rs.",
  categories: ["Outerwear", "Tailoring", "Knitwear", "Shirts", "Trousers", "Shorts", "Accessories", "Footwear"],
};

export async function loadSettings() {
  const s = await settingsStore().get("main", { type: "json" });
  return { ...DEFAULT_SETTINGS, ...(s || {}) };
}

export const SEED = [
  { id: "seed-1", name: "Oversized Wool Coat", price: 17900, category: "Outerwear", gender: "women", colors: ["#1c1c1c", "#c4b8a8"], image: "/assets/p1.jpg", images: ["/assets/p1.jpg"], sizes: ["S", "M", "L"], stock: null, published: true },
  { id: "seed-2", name: "Double-Faced Jacket", price: 13900, category: "Outerwear", gender: "men", colors: ["#1c1c1c", "#2a2a2a"], image: "/assets/p2.jpg", images: ["/assets/p2.jpg"], sizes: ["S", "M", "L", "XL"], stock: null, published: true },
  { id: "seed-3", name: "Silk Relaxed Shirt", price: 6500, category: "Shirts", gender: "women", colors: ["#8a8178", "#ddd8cc"], image: "/assets/p3.jpg", images: ["/assets/p3.jpg"], sizes: ["XS", "S", "M"], stock: null, published: true },
  { id: "seed-4", name: "Lightweight Knit", price: 5900, category: "Knitwear", gender: "men", colors: ["#3a3a3a", "#cfc6b8"], image: "/assets/p4.jpg", images: ["/assets/p4.jpg"], sizes: ["S", "M", "L"], stock: null, published: true },
  { id: "seed-5", name: "Denim Short 01", price: 1800, salePrice: null, category: "Shorts", gender: "unisex", colors: [], sizes: [], stock: null, description: "Denim short.", image: "https://user58975.na.imgto.link/public/20261121/caaf8ffe111d9add7a561187-1000040906.avif", images: ["https://user58975.na.imgto.link/public/20261121/caaf8ffe111d9add7a561187-1000040906.avif"], isNew: true, published: true },
  { id: "seed-6", name: "Denim Short 02", price: 1800, salePrice: null, category: "Shorts", gender: "unisex", colors: [], sizes: [], stock: null, description: "Denim short.", image: "https://user58975.na.imgto.link/public/20261121/7f07bbc267c1c3f7966ed62b-1000040905.avif", images: ["https://user58975.na.imgto.link/public/20261121/7f07bbc267c1c3f7966ed62b-1000040905.avif"], isNew: true, published: true },
  { id: "seed-7", name: "Shirt 01", price: 850, salePrice: null, category: "Shirts", gender: "unisex", colors: [], sizes: [], stock: null, description: "", image: "https://user58975.na.imgto.link/public/20261121/2dbe527d077d7e6daf1a89df-1000040941.avif", images: ["https://user58975.na.imgto.link/public/20261121/2dbe527d077d7e6daf1a89df-1000040941.avif"], isNew: true, published: true },
  { id: "seed-8", name: "Shirt 02", price: 850, salePrice: null, category: "Shirts", gender: "unisex", colors: [], sizes: [], stock: null, description: "", image: "https://user58975.na.imgto.link/public/20261121/de78dc0217b8378a9df66c5f-1000040942.avif", images: ["https://user58975.na.imgto.link/public/20261121/de78dc0217b8378a9df66c5f-1000040942.avif"], isNew: true, published: true },
  { id: "seed-9", name: "Shirt 03", price: 850, salePrice: null, category: "Shirts", gender: "unisex", colors: [], sizes: [], stock: null, description: "", image: "https://user58975.na.imgto.link/public/20261121/4fad3c85cf9340f2582065b1-1000040940.avif", images: ["https://user58975.na.imgto.link/public/20261121/4fad3c85cf9340f2582065b1-1000040940.avif"], isNew: true, published: true },
];

export async function loadProducts() {
  const store = productStore();
  const data = await store.get("all", { type: "json" });
  if (data) return data;
  await store.setJSON("all", SEED);
  return SEED;
}
export const saveProducts = (list) => productStore().setJSON("all", list);
