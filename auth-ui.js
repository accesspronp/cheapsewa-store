/* CheapSewa: signed-in profile avatar (top corner, mobile + PC), name editing, welcome toast. */
(function () {
  var AVATAR = "https://static.vecteezy.com/system/resources/previews/075/165/253/non_2x/smiling-male-profile-portrait-in-circle-frame-happy-person-avatar-cartoon-style-vector.jpg";
  var FALLBACK = "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#e6e0ff"/><circle cx="50" cy="38" r="18" fill="#6738ed"/><path d="M14 100c2-24 18-36 36-36s34 12 36 36z" fill="#6738ed"/></svg>');
  var token = "", user = null, btnWrap = null, menu = null, backdrop = null;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function getTok() { try { return localStorage.getItem("cs_token") || ""; } catch (e) { return ""; } }
  function cached() { try { return JSON.parse(localStorage.getItem("cs_user") || "null"); } catch (e) { return null; } }
  function saveUser(u) { user = u; try { localStorage.setItem("cs_user", JSON.stringify(u)); } catch (e) {} }
  function clearAll() { try { localStorage.removeItem("cs_token"); localStorage.removeItem("cs_user"); } catch (e) {} token = ""; user = null; }
  function avatarImg(cls) { return '<img class="' + cls + '" src="' + AVATAR + '" alt="Profile picture" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src=CSAuth.fallback">'; }

  var tt;
  function toast(t) {
    var el = document.getElementById("csToast");
    if (!el) { el = document.createElement("div"); el.id = "csToast"; el.className = "cs-toast"; document.body.appendChild(el); }
    el.textContent = t; el.classList.add("show"); clearTimeout(tt); tt = setTimeout(function () { el.classList.remove("show"); }, 2800);
  }

  function post(body) {
    return fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, j: j }; }); });
  }

  function closeMenu() { if (menu) menu.classList.remove("open"); if (backdrop) backdrop.classList.remove("show"); }
  function openMenu() {
    var r = btnWrap.getBoundingClientRect();
    if (innerWidth > 700) { menu.style.top = Math.round(r.bottom + 10) + "px"; menu.style.right = Math.max(12, Math.round(innerWidth - r.right)) + "px"; }
    else { menu.style.top = ""; menu.style.right = ""; }
    menu.classList.add("open"); backdrop.classList.add("show");
  }

  function build() {
    if (!menu) {
      backdrop = document.createElement("div"); backdrop.className = "cs-backdrop"; backdrop.onclick = closeMenu;
      menu = document.createElement("div"); menu.className = "cs-menu"; menu.setAttribute("role", "dialog");
      document.body.appendChild(backdrop); document.body.appendChild(menu);
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
      document.addEventListener("click", function (e) { if (menu.classList.contains("open") && !menu.contains(e.target) && !(btnWrap && btnWrap.contains(e.target))) closeMenu(); });
      window.addEventListener("resize", closeMenu);
    }
    menu.innerHTML =
      '<div class="cs-m-top">' + avatarImg("cs-m-av") + '<div class="cs-m-who"><b id="csName">' + esc(user.name) + '</b><small>' + esc(user.email) + '</small></div></div>' +
      '<div class="cs-m-edit" id="csView"><button type="button" class="cs-m-btn" id="csEditBtn">✎ Edit name</button></div>' +
      '<div class="cs-m-edit" id="csForm" hidden><label>Your name</label><input id="csNameIn" maxlength="80" autocomplete="name" value="' + esc(user.name) + '"><p class="cs-m-err" id="csErr"></p><div class="cs-m-row"><button type="button" class="cs-m-btn pri" id="csSave">Save</button><button type="button" class="cs-m-btn" id="csCancel">Cancel</button></div></div>' +
      '<a class="cs-m-link" href="account.html">📦 My orders</a>' +
      '<button type="button" class="cs-m-link out" id="csOut">Log out</button>';
    var $ = function (i) { return document.getElementById(i); };
    $("csEditBtn").onclick = function () { $("csView").hidden = true; $("csForm").hidden = false; $("csNameIn").focus(); $("csNameIn").select(); };
    $("csCancel").onclick = function () { $("csForm").hidden = true; $("csView").hidden = false; $("csErr").textContent = ""; };
    $("csNameIn").onkeydown = function (e) { if (e.key === "Enter") $("csSave").click(); };
    $("csSave").onclick = function () {
      var v = $("csNameIn").value.trim();
      if (v.length < 2) { $("csErr").textContent = "Enter at least 2 characters"; return; }
      $("csSave").disabled = true; $("csSave").textContent = "Saving…";
      post({ action: "updateName", name: v }).then(function (res) {
        if (res.j && res.j.ok) { saveUser(res.j.user); render(); toast("Name updated ✓"); closeMenu(); }
        else { $("csSave").disabled = false; $("csSave").textContent = "Save"; $("csErr").textContent = (res.j && res.j.error) || "Could not save. Try again."; }
      }).catch(function () { $("csSave").disabled = false; $("csSave").textContent = "Save"; $("csErr").textContent = "No connection. Try again."; });
    };
    $("csOut").onclick = function () { clearAll(); location.reload(); };
  }

  function render() {
    var loginBtn = document.getElementById("loginBtn"), mob = document.getElementById("mobileLogin"), actions = document.querySelector(".head-actions");
    if (!user) { if (btnWrap) { btnWrap.remove(); btnWrap = null; } if (loginBtn) loginBtn.style.display = ""; return; }
    if (loginBtn) loginBtn.style.display = "none";
    if (actions) {
      if (!btnWrap) {
        btnWrap = document.createElement("div"); btnWrap.className = "cs-user";
        btnWrap.innerHTML = '<button type="button" class="cs-avatar-btn" aria-label="My profile" aria-haspopup="dialog"></button>';
        actions.insertBefore(btnWrap, actions.querySelector(".cart-btn") || actions.firstChild);
        btnWrap.firstChild.onclick = function (e) { e.stopPropagation(); menu.classList.contains("open") ? closeMenu() : openMenu(); };
      }
      btnWrap.firstChild.innerHTML = avatarImg("cs-av");
      btnWrap.firstChild.title = user.name;
    }
    if (mob) { mob.innerHTML = '<span class="cs-nav-av">' + avatarImg("cs-av") + '</span><small>' + esc(user.name.split(" ")[0].slice(0, 9)) + '</small>'; }
    build();
  }

  function greet() {
    try { if (sessionStorage.getItem("cs_greet") && user) { sessionStorage.removeItem("cs_greet"); setTimeout(function () { toast("Welcome, " + user.name.split(" ")[0] + "! 👋"); }, 900); } } catch (e) {}
  }

  window.CSAuth = { fallback: FALLBACK, avatar: AVATAR };

  function init() {
    token = getTok();
    if (!token) return;
    user = cached();
    if (user) { render(); greet(); }
    post({ action: "me" }).then(function (res) {
      if (res.j && res.j.ok) { var first = !user; saveUser(res.j.user); render(); if (first) greet(); }
      else if (res.status === 401) { clearAll(); render(); }
    }).catch(function () {});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
