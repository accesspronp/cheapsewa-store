window.CSOrder = {
  resize(file) {
    return new Promise((resolve, reject) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const s = Math.min(1, 1000 / img.width), c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); resolve(c.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read image")); };
      img.src = url;
    });
  },
  async submit(order, file) {
    const screenshot = await this.resize(file), headers = { "Content-Type": "application/json" };
    try { const t = localStorage.getItem("cs_token"); if (t) headers.Authorization = "Bearer " + t; } catch (e) {}
    const r = await fetch("/api/submit-order", { method: "POST", headers, body: JSON.stringify(Object.assign({}, order, { screenshot })) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(j.error || "Save failed");
    return j.id;
  },
  done(el, id, info) {
    info = info || {};
    try { localStorage.setItem("cs_last", JSON.stringify({ id, phone: info.phone || "" })); } catch (e) {}
    const track = "account.html?id=" + encodeURIComponent(id) + "&phone=" + encodeURIComponent(info.phone || "");
    const wa = info.wa ? '<a class="cs-done-wa" href="' + info.wa + '" target="_blank" rel="noopener">Message us on WhatsApp</a>' : "";
    el.innerHTML = '<div class="cs-done"><div class="cs-done-tick">&#10003;</div><h3>Order received!</h3>' +
      '<p>Your payment screenshot is saved. We will verify it and update your order status shortly.</p>' +
      '<div class="cs-done-id"><small>Your Order ID</small><b>' + id + '</b></div>' +
      '<a class="primary-btn full cs-done-track" href="' + track + '">Track my order &rarr;</a>' + wa +
      '<small class="cs-done-note">Save your Order ID. You can also create an account to see all your orders in one place.</small></div>';
    el.hidden = false; el.scrollIntoView && el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};
