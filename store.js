const $ = (s, el = document) => el.querySelector(s);
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lines = (s) => esc(s).replace(/\n/g, "<br>");

let products = [], settings = {}, filter = { cat: "", gender: "", q: "", isNew: false };
let wish = read("wish", []), cart = read("cart", {});
let sort = "new", view = "bag", done = null, pid = null, psize = "", pimg = 0;

const money = (n) => { const c = settings.currency || "Rs."; return (c.length > 1 ? c + " " : c) + Number(n).toLocaleString("en-US"); };
const unit = (p) => (p.salePrice && p.salePrice < p.price ? p.salePrice : p.price);
const priceHtml = (p) => (unit(p) < p.price ? `<s>${money(p.price)}</s><span class="sale">${money(unit(p))}</span>` : money(p.price));
const soldOut = (p) => p.stock === 0;
const waNum = () => (settings.whatsapp || "").replace(/\D/g, "");
const find = (id) => products.find((p) => p.id === id);

async function load() {
  const [p, s] = await Promise.all([
    fetch("/api/products").then((r) => r.json()).catch(() => []),
    fetch("/api/settings").then((r) => r.json()).catch(() => ({})),
  ]);
  products = Array.isArray(p) ? p : []; settings = s || {};
  applySettings(); render();
}

function applySettings() {
  const s = settings;
  if (s.logo) { $("#logo").textContent = s.logo; $("#wlLogo").textContent = s.logo; }
  if (s.banner !== undefined) $("#banner").textContent = s.banner;
  if (s.heroEyebrow !== undefined) $("#heroEye").textContent = s.heroEyebrow;
  if (s.heroTitle) $("#heroTitle").innerHTML = lines(s.heroTitle);
  if (s.heroText !== undefined) $("#heroText").innerHTML = lines(s.heroText);
  if (s.heroTextSi !== undefined) $("#heroSi").textContent = s.heroTextSi;
  if (s.heroImage) $("#heroImg").src = s.heroImage;
  const wa = (s.whatsapp || "").replace(/\D/g, "");
  const fab = $("#waFab"); fab.hidden = !wa;
  $("#flogo").textContent = s.logo || "RK FASHION";
  const fw = $("#fWa"); fw.hidden = !wa;
  if (wa) { fw.href = `https://wa.me/${wa}`; fw.textContent = "WhatsApp · " + (wa.startsWith("94") ? "0" + wa.slice(2) : "+" + wa); }
  if (wa) fab.href = `https://wa.me/${wa}?text=${encodeURIComponent("Hi! I'm interested in your products at " + (s.logo || "RK FASHION") + ".")}`;
}

function render() {
  const cats = [...new Set([...(settings.categories || []), ...products.map((p) => p.category)])];
  $("#catList").innerHTML = cats.map((c) => `<button data-cat="${esc(c)}" class="${filter.cat === c ? "on" : ""}">${esc(c)}</button>`).join("");
  const list = products.filter((p) =>
    (!filter.cat || p.category === filter.cat) &&
    (!filter.gender || p.gender === filter.gender || p.gender === "unisex") &&
    (!filter.isNew || p.isNew) &&
    (!filter.q || (p.name + p.category).toLowerCase().includes(filter.q.toLowerCase())));
  if (sort === "lo") list.sort((a, b) => unit(a) - unit(b)); else if (sort === "hi") list.sort((a, b) => unit(b) - unit(a));
  $("#resCount").textContent = `${list.length} ${list.length === 1 ? "piece" : "pieces"} · භාණ්ඩ ${list.length}`;
  $("#grid").innerHTML = list.length ? list.map((p, i) => {
    const sale = unit(p) < p.price;
    const tag = soldOut(p) ? '<span class="tag out">SOLD OUT</span>' : sale ? '<span class="tag sale">SALE</span>' : p.isNew ? '<span class="tag">NEW</span>' : "";
    const btn = soldOut(p) ? '<button class="add" disabled>SOLD OUT</button>' : p.sizes?.length ? `<button class="add" data-open="${p.id}">CHOOSE SIZE</button>` : `<button class="add" data-add="${p.id}">ADD TO BAG</button>`;
    return `<article class="card" data-open="${p.id}" style="--i:${Math.min(i, 8)}">
    <div class="ph"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" onerror="this.style.visibility='hidden'">${p.images?.[1] ? `<img class="alt" src="${esc(p.images[1])}" alt="" loading="lazy">` : ""}${tag}<span class="qv">QUICK VIEW<span class="si">බලන්න</span></span>
     <button class="heart ${wish.includes(p.id) ? "on" : ""}" data-w="${p.id}" aria-label="Wishlist"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.4-7 10-7 10z"/></svg></button></div>
    <h3>${esc(p.name)}</h3><div class="price">${priceHtml(p)}</div>
    <div class="sw">${(p.colors || []).map((c) => `<i style="background:${esc(c)}"></i>`).join("")}</div>${btn}</article>`;
  }).join("") : '<p class="empty">No pieces found.<span class="si">කිසිවක් හමු වුණේ නැත.</span></p>';
  renderCart(); if (pid) renderModal();
}

/* ---------- product window ---------- */
function openProduct(id) { pid = id; psize = ""; pimg = 0; renderModal(); }
function renderModal() {
  const p = find(pid), m = $("#pm");
  if (!p) { m.hidden = true; pid = null; return; }
  const imgs = p.images?.length ? p.images : [p.image];
  const low = p.stock !== null && p.stock !== undefined && p.stock > 0 && p.stock <= 3;
  m.hidden = false;
  m.innerHTML = `<div class="pbox"><button class="x" data-close aria-label="Close">✕</button>
   <div class="gal"><img class="big" src="${esc(imgs[pimg] || imgs[0])}" alt="">
    ${imgs.length > 1 ? `<div class="th">${imgs.map((u, i) => `<img src="${esc(u)}" data-img="${i}" class="${i === pimg ? "on" : ""}" alt="">`).join("")}</div>` : ""}</div>
   <div class="pinfo"><small>${esc(p.category)}</small><h2>${esc(p.name)}</h2><div class="pp">${priceHtml(p)}</div>
    ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ""}
    ${p.sizes?.length ? `<div class="lab">SIZE · ප්‍රමාණය</div><div class="sizes">${p.sizes.map((s) => `<button data-size="${esc(s)}" class="${s === psize ? "on" : ""}">${esc(s)}</button>`).join("")}</div>` : ""}
    ${(p.colors || []).length ? `<div class="lab">COLOUR · වර්ණ</div><div class="sw">${p.colors.map((c) => `<i style="background:${esc(c)}"></i>`).join("")}</div>` : ""}
    <div class="warn" id="pmsg">${soldOut(p) ? "Sold out · අවසන් වී ඇත" : low ? `Only ${p.stock} left · ${p.stock}ක් පමණක් ඉතිරියි` : ""}</div>
    <button class="btn dark" data-addm ${soldOut(p) ? "disabled" : ""}>ADD TO BAG<span class="si">බෑගයට දාන්න</span></button>
    ${waNum() ? `<a class="btn ask" target="_blank" rel="noopener" href="https://wa.me/${waNum()}?text=${encodeURIComponent(`Hi! I'm interested in "${p.name}" (${money(unit(p))}) at ${settings.logo || "RK FASHION"}.`)}">ASK ON WHATSAPP<span class="si">WhatsApp එකෙන් අහන්න</span></a>` : ""}</div></div>`;
}
function closeProduct() { pid = null; $("#pm").hidden = true; }

/* ---------- bag ---------- */
function addToCart(id, size = "") {
  const p = find(id); if (!p || soldOut(p)) return;
  const k = id + "|" + size, have = cart[k] || 0;
  if (p.stock !== null && p.stock !== undefined && have + 1 > p.stock) return false;
  cart[k] = have + 1; write("cart", cart);
  view = "bag"; done = null; renderCart(); $("#drawer").classList.add("open"); return true;
}
const rowsOf = () => Object.entries(cart).map(([k, q]) => { const [id, size] = k.split("|"); return { k, id, size, q, p: find(id) }; }).filter((r) => r.p);
const totalOf = (rows) => rows.reduce((s, r) => s + unit(r.p) * r.q, 0);

function renderCart() {
  const rows = rowsOf(), total = totalOf(rows);
  $("#count").textContent = rows.reduce((s, r) => s + r.q, 0);
  const items = $("#items"), foot = $("#foot");
  if (done) {
    const wa = (settings.whatsapp || "").replace(/\D/g, "");
    items.innerHTML = `<div class="done"><h3>Thank you!</h3><p>Order #${esc(done.id.slice(-6))} received. We will contact you soon. Tap the button below to send the order to us on WhatsApp.<span class="si">ස්තූතියි! ඔබේ ඇණවුම ලැබුණා. පහත බොත්තමෙන් WhatsApp හරහා අපට එවන්න.</span></p>
     ${wa ? `<a class="btn dark" target="_blank" rel="noopener" href="${waLink(wa, done)}">SEND ORDER ON WHATSAPP<span class="si" style="display:block">WhatsApp එකෙන් යවන්න</span></a>` : ""}</div>`;
    foot.innerHTML = '<button class="btn light" data-continue>CONTINUE SHOPPING</button>';
    return;
  }
  if (view === "form" && rows.length) {
    items.innerHTML = `<div class="cform"><label>NAME · නම</label><input id="cName" autocomplete="name">
     <label>PHONE · දුරකථන අංකය</label><input id="cPhone" type="tel" autocomplete="tel">
     <label>ADDRESS · ලිපිනය</label><textarea id="cAddr" rows="2" autocomplete="street-address"></textarea>
     <label>NOTE (optional) · සටහන</label><textarea id="cNote" rows="2"></textarea>
     <input class="hp" id="cWeb" tabindex="-1" autocomplete="off" aria-hidden="true"><div class="cerr" id="cerr"></div></div>`;
    foot.innerHTML = `<div class="total"><span>Total <span class="si inl">· එකතුව</span></span><b>${money(total)}</b></div>
     <button class="btn dark" id="place">PLACE ORDER<span class="si">ඇණවුම තහවුරු කරන්න</span></button>
     <button class="link" data-back>← Back to bag</button>`;
    return;
  }
  items.innerHTML = rows.length ? rows.map((r) => `
   <div class="line"><img src="${esc(r.p.image)}" alt=""><div>${esc(r.p.name)}${r.size ? ` <span class="sz">· ${esc(r.size)}</span>` : ""}<br><span style="color:#9a958d">${r.q} × ${money(unit(r.p))}</span></div><button data-rm="${esc(r.k)}">Remove</button></div>`).join("") : '<p class="empty">Your bag is empty.<span class="si">ඔබේ බෑගය හිස්ය.</span></p>';
  foot.innerHTML = `<div class="total"><span>Subtotal <span class="si inl">· එකතුව</span></span><b>${money(total)}</b></div>
   <button class="btn dark" id="checkout" ${rows.length ? "" : "disabled"}>CHECKOUT<span class="si">ඇණවුම් කරන්න</span></button>`;
}

function waLink(wa, o) {
  const msg = `New order #${o.id.slice(-6)} · ${settings.logo || "RK FASHION"}\n${o.name} · ${o.phone}\n${o.address ? o.address + "\n" : ""}` +
    o.items.map((i) => `${i.qty} × ${i.name}${i.size ? " (" + i.size + ")" : ""}`).join("\n") + `\nTotal: ${money(o.total)}${o.note ? "\nNote: " + o.note : ""}`;
  return `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
}

async function placeOrder() {
  const err = (m) => ($("#cerr").textContent = m);
  const name = $("#cName").value.trim(), phone = $("#cPhone").value.trim();
  if (!name || !phone) return err("Please enter your name and phone. · නම සහ දුරකථන අංකය ඇතුළත් කරන්න.");
  const btn = $("#place"); btn.disabled = true; err("");
  try {
    const r = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      name, phone, address: $("#cAddr").value, note: $("#cNote").value, website: $("#cWeb").value,
      items: rowsOf().map((x) => ({ id: x.id, size: x.size, qty: x.q })) }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Could not place the order");
    done = d; cart = {}; write("cart", cart); view = "bag";
    const wa = (settings.whatsapp || "").replace(/\D/g, "");
    if (wa) { try { window.open(waLink(wa, d), "_blank", "noopener"); } catch {} }
    fetch("/api/products").then((x) => x.json()).then((p) => { products = p; render(); }).catch(() => {});
    renderCart();
  } catch (e) { err(e.message); btn.disabled = false; }
}

/* ---------- events ---------- */
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-cat],[data-f],[data-w],[data-add],[data-open],[data-rm],[data-close],[data-img],[data-size],[data-addm],[data-continue],[data-back],#bagBtn,#closeBag,#searchBtn,#checkout,#place,#pm");
  if (!t) return;
  const d = t.dataset;
  if (t.id === "pm") { if (e.target === t) closeProduct(); return; }
  if (d.cat !== undefined) { filter.cat = d.cat; render(); }
  else if (d.f) {
    e.preventDefault();
    filter = { cat: "", gender: ["women", "men"].includes(d.f) ? d.f : "", q: "", isNew: d.f === "new" };
    if (d.f === "acc") filter.cat = "Accessories";
    render(); $("#shop").scrollIntoView({ behavior: "smooth" });
  }
  else if (d.w) { wish = wish.includes(d.w) ? wish.filter((x) => x !== d.w) : [...wish, d.w]; write("wish", wish); render(); }
  else if (d.add) addToCart(d.add);
  else if (d.open) openProduct(d.open);
  else if (d.rm) { delete cart[d.rm]; write("cart", cart); renderCart(); }
  else if (d.close !== undefined) closeProduct();
  else if (d.img) { pimg = +d.img; renderModal(); }
  else if (d.size) { psize = d.size; renderModal(); }
  else if (d.addm !== undefined) {
    const p = find(pid);
    if (p.sizes?.length && !psize) { $("#pmsg").textContent = "Please choose a size · කරුණාකර ප්‍රමාණයක් තෝරන්න"; return; }
    if (addToCart(pid, psize) === false) $("#pmsg").textContent = "No more stock available · තවත් තොග නැත";
    else closeProduct();
  }
  else if (d.continue !== undefined) { done = null; view = "bag"; renderCart(); $("#drawer").classList.remove("open"); }
  else if (d.back !== undefined) { view = "bag"; renderCart(); }
  else if (t.id === "bagBtn") $("#drawer").classList.add("open");
  else if (t.id === "closeBag") { $("#drawer").classList.remove("open"); if (done) { done = null; renderCart(); } }
  else if (t.id === "searchBtn") { const b = $("#searchbar"); b.hidden = !b.hidden; if (!b.hidden) $("#sq").focus(); }
  else if (t.id === "checkout") { view = "form"; renderCart(); }
  else if (t.id === "place") placeOrder();
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeProduct(); $("#drawer").classList.remove("open"); } });
// Pick up admin changes automatically (every 30s and when the tab is opened again)
async function refresh() {
  if (document.hidden || view === "form" || done) return;
  try {
    const [p, st] = await Promise.all([fetch("/api/products").then((r) => r.json()), fetch("/api/settings").then((r) => r.json())]);
    if (!Array.isArray(p)) return;
    if (JSON.stringify(p) === JSON.stringify(products) && JSON.stringify(st) === JSON.stringify(settings)) return;
    products = p; settings = st; applySettings(); render();
  } catch {}
}
setInterval(refresh, 30000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
$("#sort").addEventListener("change", (e) => { sort = e.target.value; render(); });
$("#menuBtn").addEventListener("click", () => $("nav").classList.toggle("open"));
$("nav").addEventListener("click", (e) => { if (e.target.closest("a")) $("nav").classList.remove("open"); });
addEventListener("scroll", () => $("header").classList.toggle("scrolled", scrollY > 8), { passive: true });
$("#sq").addEventListener("input", (e) => { filter = { cat: "", gender: "", q: e.target.value, isNew: false }; render(); });
$("#welcome").addEventListener("click", () => { $("#welcome").style.display = "none"; });
load();
