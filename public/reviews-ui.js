/* Review box under every product (each product has its own reviews). */
(function () {
  var id = Number(new URLSearchParams(location.search).get("id"));
  var main = document.querySelector(".product-page-wrap");
  if (!id || !main) return;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function tok() { try { return localStorage.getItem("cs_token") || ""; } catch (e) { return ""; } }
  function stars(n) { var h = ""; for (var i = 1; i <= 5; i++) h += '<span class="' + (i <= Math.round(n) ? "on" : "") + '">★</span>'; return h; }
  function ago(iso) {
    var d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (d < 1) return "Today"; if (d === 1) return "Yesterday"; if (d < 30) return d + " days ago";
    if (d < 365) { var m = Math.floor(d / 30); return m + " month" + (m > 1 ? "s" : "") + " ago"; }
    var y = Math.floor(d / 365); return y + " year" + (y > 1 ? "s" : "") + " ago";
  }
  var box = document.createElement("section");
  box.className = "reviews-box"; box.id = "reviews";
  box.innerHTML = '<div class="rv-head"><div><span class="eyebrow">CUSTOMER REVIEWS</span><h2 id="rvTitle">Reviews</h2></div><div class="rv-sum" id="rvSum"></div></div>' +
    '<div class="rv-form" id="rvForm"></div><div class="rv-list" id="rvList"><p class="rv-empty">Loading reviews…</p></div>';
  main.appendChild(box);
  var $ = function (i) { return document.getElementById(i); }, rating = 0;

  function setName() {
    (window.CS_READY || Promise.resolve()).then(function () {
      var p = (window.CS_PRODUCTS || []).find(function (x) { return x.id === id; });
      if (p) $("rvTitle").textContent = p.name + " reviews";
    });
  }
  function drawForm() {
    var f = $("rvForm");
    if (!tok()) { f.innerHTML = '<div class="rv-login">Bought this product? <a href="account.html">Sign in</a> to write a review.</div>'; return; }
    f.innerHTML = '<b>Write a review</b><div class="rv-pick" id="rvPick" role="radiogroup" aria-label="Your rating">' +
      [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-n="' + n + '" aria-label="' + n + ' star' + (n > 1 ? "s" : "") + '">★</button>'; }).join("") + '</div>' +
      '<textarea id="rvText" maxlength="500" rows="3" placeholder="Tell others about your experience with this product…"></textarea>' +
      '<div class="rv-row"><small id="rvCount">0 / 500</small><button type="button" class="primary-btn" id="rvSend">Post review</button></div><p class="rv-msg" id="rvMsg"></p>';
    var btns = f.querySelectorAll("#rvPick button");
    function paint(n) { btns.forEach(function (b) { b.classList.toggle("on", Number(b.dataset.n) <= n); }); }
    btns.forEach(function (b) {
      b.onclick = function () { rating = Number(b.dataset.n); paint(rating); };
      b.onmouseenter = function () { paint(Number(b.dataset.n)); };
      b.onmouseleave = function () { paint(rating); };
    });
    $("rvText").oninput = function () { $("rvCount").textContent = this.value.length + " / 500"; };
    $("rvSend").onclick = function () {
      var m = $("rvMsg"), text = $("rvText").value.trim(); m.className = "rv-msg";
      if (!rating) { m.textContent = "Please choose a star rating."; return; }
      if (text.length < 5) { m.textContent = "Please write at least 5 characters."; return; }
      var btn = $("rvSend"); btn.disabled = true; btn.textContent = "Posting…";
      fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok() }, body: JSON.stringify({ product: id, rating: rating, text: text }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok && j.ok, j: j, st: r.status }; }); })
        .then(function (res) {
          btn.disabled = false; btn.textContent = "Post review";
          if (res.ok) { rating = 0; $("rvText").value = ""; $("rvCount").textContent = "0 / 500"; paint(0); m.className = "rv-msg ok"; m.textContent = res.j.edited ? "Your review was updated ✓" : "Thanks! Your review is live ✓"; load(); }
          else { m.textContent = res.st === 401 ? "Your login expired. Please sign in again." : (res.j.error || "Could not post. Try again."); }
        }).catch(function () { btn.disabled = false; btn.textContent = "Post review"; m.textContent = "No connection. Try again."; });
    };
  }
  function load() {
    fetch("/api/reviews?product=" + id, { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) throw 0;
      $("rvSum").innerHTML = j.count ? '<b>' + j.avg.toFixed(1) + '</b><span class="rv-stars">' + stars(j.avg) + '</span><small>' + j.count + ' review' + (j.count > 1 ? "s" : "") + '</small>' : "";
      $("rvList").innerHTML = j.count ? j.reviews.map(function (r) {
        return '<article class="rv-card"><div class="rv-top"><span class="rv-av">' + esc(r.name.charAt(0).toUpperCase()) + '</span><div><b>' + esc(r.name) + '</b><small>' + esc(ago(r.createdAt)) + '</small></div><span class="rv-stars">' + stars(r.rating) + '</span></div><p>' + esc(r.text) + '</p></article>';
      }).join("") : '<p class="rv-empty">No reviews yet. Be the first to review this product.</p>';
    }).catch(function () { $("rvList").innerHTML = '<p class="rv-empty">Reviews could not be loaded right now.</p>'; });
  }
  setName(); drawForm(); load();
})();
