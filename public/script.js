const products=window.CS_PRODUCTS;
let activeCategory="All",coupon=null;const esc=CS.esc;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const money=n=>"NPR "+Number(n).toLocaleString("en-IN");
function toast(t){const el=$("#toast");el.textContent=t;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2300)}
function renderProducts(){
 const q=$("#searchInput").value.toLowerCase(),sort=$("#sortSelect").value,low=p=>CS.eff(CS.cheapest(p));
 let list=products.filter(p=>(activeCategory==="All"||p.cat===activeCategory)&&(`${p.name} ${p.cat} ${p.desc}`).toLowerCase().includes(q));
 if(sort==="low")list.sort((a,b)=>low(a)-low(b));if(sort==="high")list.sort((a,b)=>low(b)-low(a));if(sort==="az")list.sort((a,b)=>a.name.localeCompare(b.name));
 $("#productGrid").innerHTML=list.map((p,i)=>{
  const ch=CS.cheapest(p),sale=CS.onSale(ch),out=!CS.prodOk(p),tag=p.badge||(sale?"Save "+CS.pct(ch)+"%":"");
  return `<article class="product-card" style="--i:${Math.min(i,11)}"><a class="product-card-link" href="product.html?id=${p.id}" aria-label="View ${esc(p.name)} plans"><div class="product-art" style="--art:${esc(p.color)}"><span class="product-cat">${esc(p.cat)}</span>${out?'<span class="oos">Out of stock</span>':(CS.pillHtml(p)+(tag?`<span class="deal-tag">${esc(tag)}</span>`:""))}${CS.img(p,"product-img")}</div><div class="product-body"><h3>${esc(p.name)}</h3><p>${esc(p.desc)}</p><div class="product-foot"><span class="price">${sale?`<s class="was">${money(ch[1])}</s> `:""}${money(CS.eff(ch))}<small>Starting price</small></span><span class="add-btn">View plans +</span></div></div></a></article>`}).join("");
 $("#emptyState").hidden=!!list.length;
}
function setCategory(c){activeCategory=c;$$("[data-cat]").forEach(b=>b.classList.toggle("active",b.dataset.cat===c));renderProducts();$("#categoryMenu").classList.remove("show");document.querySelector("#shop").scrollIntoView({behavior:"smooth"})}
/* ---- Cart: lines live in localStorage (shared with product pages) ---- */
function cartLines(){return CS.cart.load().map(l=>{const p=products.find(x=>x.id===l.id),pl=p&&p.plans.find(x=>x[0]===l.plan);return pl?{p,pl,qty:Math.max(1,Math.min(10,l.qty|0)),ok:CS.prodOk(p)&&CS.planOk(pl)}:null}).filter(Boolean)}
function saveLines(ls){CS.cart.save(ls.map(x=>({id:x.p.id,plan:x.pl[0],qty:x.qty})))}
function subtotal(ls){return ls.reduce((s,x)=>s+CS.eff(x.pl)*x.qty,0)}
function discountOf(sub){return coupon?Math.round(sub*coupon.percent/100):0}

function renderCart(){
 const ls=cartLines(),count=ls.reduce((s,x)=>s+x.qty,0),sub=subtotal(ls),disc=discountOf(sub);
 if(ls.length!==CS.cart.load().length)saveLines(ls);
 $("#cartCount").textContent=count;$("#drawerCount").textContent="("+count+")";
 $("#cartSub").textContent=money(sub);$("#cartTotal").textContent=money(sub-disc);
 $("#cartDiscRow").hidden=!disc;$("#cartDisc").textContent="− "+money(disc);
 $("#cartItems").innerHTML=ls.length?ls.map(x=>`<div class="cart-row${x.ok?"":" is-oos"}" data-k="${esc(x.p.id+"|"+x.pl[0])}"><div class="cart-info"><b>${esc(x.p.name)}</b><label class="cart-plan-label">Choose plan / months<select class="cart-plan">${x.p.plans.map(pl=>`<option value="${esc(pl[0])}"${pl[0]===x.pl[0]?" selected":""}${CS.planOk(pl)||pl[0]===x.pl[0]?"":" disabled"}>${esc(pl[0])} · ${money(CS.eff(pl))}${CS.planOk(pl)?"":" (out of stock)"}</option>`).join("")}</select></label><small>${CS.onSale(x.pl)?`<s class="was">${money(x.pl[1])}</s> `:""}${money(CS.eff(x.pl))} each${x.ok?"":' · <span class="cart-warn">Out of stock: pick another plan or remove</span>'}</small></div><div class="cart-side"><div class="qty"><button type="button" data-dec aria-label="Less">−</button><b>${x.qty}</b><button type="button" data-inc aria-label="More">+</button></div><b class="line-total">${money(CS.eff(x.pl)*x.qty)}</b><button type="button" class="cart-rm" data-rm>Remove</button></div></div>`).join(""):'<div class="empty-state">Your cart is empty.<br>Explore products to get started.</div>';
 $("#checkoutBtn").disabled=!ls.length||ls.some(x=>!x.ok);
 $("#couponInput").readOnly=!!coupon;$("#couponBtn").textContent=coupon?"Remove":"Apply";
}
$("#cartItems").addEventListener("click",e=>{
 const row=e.target.closest(".cart-row");if(!row)return;
 const ls=cartLines(),x=ls.find(y=>y.p.id+"|"+y.pl[0]===row.dataset.k);if(!x)return;
 if(e.target.closest("[data-inc]"))x.qty=Math.min(10,x.qty+1);else if(e.target.closest("[data-dec]"))x.qty--;else if(e.target.closest("[data-rm]"))x.qty=0;else return;
 saveLines(ls.filter(y=>y.qty>0));
});
$("#cartItems").addEventListener("change",e=>{
 if(!e.target.classList.contains("cart-plan"))return;
 const row=e.target.closest(".cart-row"),ls=cartLines(),x=ls.find(y=>y.p.id+"|"+y.pl[0]===row.dataset.k);if(!x)return;
 x.pl=x.p.plans.find(pl=>pl[0]===e.target.value)||x.pl;
 const merged=[];ls.forEach(y=>{const m=merged.find(z=>z.p.id===y.p.id&&z.pl[0]===y.pl[0]);if(m)m.qty=Math.min(10,m.qty+y.qty);else merged.push(y)});
 saveLines(merged);
});
document.addEventListener("cs-cart",renderCart);
window.addEventListener("storage",e=>{if(e.key==="cs_cart_v2")renderCart()});
/* ---- Coupon ---- */
function couponMsg(t,good){const m=$("#couponMsg");m.textContent=t;m.className="coupon-msg "+(good?"ok":"bad")}
function saveCoupon(){try{coupon?localStorage.setItem("cs_coupon",coupon.code):localStorage.removeItem("cs_coupon")}catch(e){}}
async function applyCoupon(code,silent){
 code=String(code||"").trim().toUpperCase();
 if(!code){coupon=null;saveCoupon();couponMsg("",true);renderCart();return}
 try{
  const r=await fetch("/api/coupon",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code})}),j=await r.json();
  if(j.ok){coupon={code:j.code,percent:j.percent};couponMsg("Coupon "+j.code+" applied: "+j.percent+"% off",true)}
  else{coupon=null;if(!silent)couponMsg(j.error||"This coupon is not valid",false)}
 }catch(e){if(!silent)couponMsg("Could not check the coupon. Please try again.",false)}
 saveCoupon();renderCart();
}
$("#couponBtn").addEventListener("click",()=>{if(coupon){$("#couponInput").value="";applyCoupon("")}else applyCoupon($("#couponInput").value)});
$("#couponInput").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();$("#couponBtn").click()}});
function openCart(){closeModals();$("#cartDrawer").classList.add("open");$("#overlay").classList.add("show")}
function showModal(id){$("#overlay").classList.add("show");$(id).classList.add("show")}
function closeModals(){$("#overlay").classList.remove("show");$("#cartDrawer").classList.remove("open");$$(".modal").forEach(m=>m.classList.remove("show"))}
let paymentTimer=null,paymentSeconds=900,paymentExpired=false;
function totalCart(){const s=subtotal(cartLines());return s-discountOf(s)}
function setCheckoutStep(step){
 $$(".pay-step").forEach((el,i)=>{el.hidden=(i+1)!==step;el.classList.toggle("is-active",(i+1)===step)});
 $("#checkoutModal").scrollTo({top:0,behavior:"smooth"});
}
function stopPaymentTimer(){if(paymentTimer){clearInterval(paymentTimer);paymentTimer=null}}
function startPaymentTimer(){
 stopPaymentTimer();paymentSeconds=900;paymentExpired=false;
 $("#checkoutExpired").hidden=true;$("#checkoutPaidBtn").disabled=false;$("#checkoutProofPanel").hidden=false;$("#checkoutVerifyBtn").disabled=true;
 $("#proofInput").disabled=false;$("#proofInput").value="";
 updatePaymentTimer();
 paymentTimer=setInterval(()=>{
  paymentSeconds--;updatePaymentTimer();
  if(paymentSeconds<=0){stopPaymentTimer();paymentExpired=true;$("#checkoutExpired").hidden=false;$("#checkoutPaidBtn").disabled=true;$("#checkoutVerifyBtn").disabled=true;$("#proofInput").disabled=true;$("#checkoutPaidBtn").disabled=true;}
 },1000);
}
function updatePaymentTimer(){
 const mm=String(Math.floor(paymentSeconds/60)).padStart(2,"0"),ss=String(paymentSeconds%60).padStart(2,"0");
 $("#checkoutCountdown").textContent=mm+":"+ss;
}
function checkout(){
 const ls=cartLines();
 if(!ls.length){toast("Your cart is empty");return}
 if(ls.some(x=>!x.ok)){toast("Remove or change the out-of-stock item first");return}
 const sub=subtotal(ls),disc=discountOf(sub),total=sub-disc;
 $("#checkoutSummary").innerHTML=`<div class="checkout-summary">${ls.map(x=>`<div><span>${esc(x.p.name)} · ${esc(x.pl[0])} × ${x.qty}</span><b>${money(CS.eff(x.pl)*x.qty)}</b></div>`).join("")}${disc?`<div><span>Coupon ${esc(coupon.code)} (${coupon.percent}% off)</span><b>− ${money(disc)}</b></div>`:""}<hr><div><b>Total</b><b>${money(total)}</b></div></div>`;
 $("#amountConfirmation").innerHTML=`<div class="amount-line"><span>Selected items</span><b>${ls.reduce((s,x)=>s+x.qty,0)}</b></div>${disc?`<div class="amount-line"><span>Discount (${esc(coupon.code)})</span><b>− ${money(disc)}</b></div>`:""}<div class="amount-line amount-grand"><span>Amount to pay</span><strong>${money(total)}</strong></div>`;
 $("#paymentFinalSummary").textContent="Total due: "+money(total);
 $("#checkoutForm").reset();stopPaymentTimer();$("#acceptAmount").checked=false;$("#amountAcceptBtn").disabled=true;
 setCheckoutStep(1);closeModals();showModal("#checkoutModal");
}
$("#checkoutContinue").addEventListener("click",()=>{
 const name=$('#checkoutForm [name="name"]'),phone=$('#checkoutForm [name="phone"]');
 if(!name.reportValidity()||!phone.reportValidity())return;
 setCheckoutStep(2);
});
$("#acceptAmount").addEventListener("change",e=>$("#amountAcceptBtn").disabled=!e.target.checked);
$("#amountAcceptBtn").addEventListener("click",()=>{if($("#acceptAmount").checked)setCheckoutStep(3)});
$$("[data-back-step]").forEach(b=>b.addEventListener("click",()=>{if(Number(b.dataset.backStep)===3)stopPaymentTimer();setCheckoutStep(Number(b.dataset.backStep))}));
$("#changeCheckoutPayment").addEventListener("click",()=>{stopPaymentTimer();setCheckoutStep(3)});
$("#checkoutForm").addEventListener("change",e=>{
 if(e.target.name==="payment"){
  const method=e.target.value;
  $("#paymentFinalSummary").textContent=method+" selected · Amount due: "+money(totalCart());
  setCheckoutStep(4);startPaymentTimer();
 }
});
$("#checkoutPaidBtn").addEventListener("click",()=>{
 if(paymentExpired)return;
 $("#checkoutProofPanel").hidden=false;
 $("#checkoutProofPanel").scrollIntoView({behavior:"smooth",block:"nearest"});
});
$("#proofInput").addEventListener("change",e=>{
 $("#checkoutVerifyBtn").disabled=!(e.target.files&&e.target.files[0]&&e.target.files[0].type.startsWith("image/"))||paymentExpired;
});
$("#checkoutVerifyBtn").addEventListener("click",async()=>{
 if(paymentExpired){toast("Your 15-minute payment session expired");return}
 const file=$("#proofInput").files[0];if(!file){toast("Please select your payment screenshot");return}
 const fd=new FormData($("#checkoutForm"));
 const ls=cartLines(),items=ls.map(x=>`${x.p.name} (${x.pl[0]}) x ${x.qty}`).join(", ");
 const btn=$("#checkoutVerifyBtn");btn.disabled=true;btn.textContent="Saving your order…";
 try{
  const id=await window.CSOrder.submit({name:fd.get("name"),phone:fd.get("phone"),product:items,plan:"Cart order",amount:totalCart(),method:fd.get("payment"),items:ls.map(x=>({id:x.p.id,plan:x.pl[0],qty:x.qty})),coupon:coupon?coupon.code:""},file);
  stopPaymentTimer();
  const msg=`Hello CheapSewa! I have paid.\nOrder ID: ${id}\nName: ${fd.get("name")}\nTotal: ${money(totalCart())}`;
  const phone=fd.get("phone");CS.cart.save([]);coupon=null;saveCoupon();$("#couponInput").value="";couponMsg("",true);renderCart();
  window.CSOrder.done($("#checkoutStep4"),id,{phone:phone,wa:"https://wa.me/9779717647043?text="+encodeURIComponent(msg)});
 }catch(err){
  console.error(err);btn.disabled=false;btn.innerHTML="Verify payment <span>→</span>";
  alert((err&&err.message)||"Could not save your order. Please try again.");
 }
});
$("#searchInput").addEventListener("input",renderProducts);$("#sortSelect").addEventListener("change",renderProducts);$("#openCart").onclick=openCart;$("#checkoutBtn").onclick=checkout;$("#overlay").onclick=closeModals;$$("[data-close]").forEach(b=>b.onclick=closeModals);
$("#categoryToggle").onclick=()=>$("#categoryMenu").classList.toggle("show");$("#categoryMenu").querySelectorAll("button").forEach(b=>b.onclick=()=>setCategory(b.dataset.cat));$$(".category-card").forEach(b=>b.onclick=()=>setCategory(b.dataset.cat));$$(".filter-chips button").forEach(b=>b.onclick=()=>setCategory(b.dataset.cat));$("#loginBtn").onclick=()=>location.href="account.html";$("#hamb").onclick=()=>$("#navlinks").classList.toggle("open");$("#year").textContent=new Date().getFullYear();
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModals();if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("#searchInput").focus()}});
(window.CS_READY||Promise.resolve()).then(()=>{renderProducts();renderCart();
 let c="";try{c=localStorage.getItem("cs_coupon")||""}catch(e){}
 if(c){$("#couponInput").value=c;applyCoupon(c,true)}
 if(location.hash==="#cart")openCart();
});
window.addEventListener("hashchange",()=>{if(location.hash==="#cart")openCart()});

/* Smooth subscription-store style hero carousel */
(()=> {
 const root=document.querySelector(".hero-slider");
 const slides=[...document.querySelectorAll(".hero-slide")];
 const dots=[...document.querySelectorAll(".slider-dots button")];
 if(!root||slides.length<2)return;
 let current=0,timer=null,paused=false;
 const show=(index)=>{
  const next=(index+slides.length)%slides.length;
  if(next===current)return;
  const old=slides[current],incoming=slides[next];
  old.classList.remove("active");
  old.classList.add("exit-left");
  incoming.classList.remove("exit-left");
  incoming.classList.add("active");
  dots.forEach((dot,i)=>dot.classList.toggle("active",i===next));
  current=next;
  window.setTimeout(()=>old.classList.remove("exit-left"),1050);
 };
 const stop=()=>{if(timer){clearInterval(timer);timer=null}};
 const play=()=>{stop();if(!paused&&!matchMedia("(prefers-reduced-motion: reduce)").matches)timer=setInterval(()=>show(current+1),1900)};
 document.querySelector("#heroPrev")?.addEventListener("click",()=>{show(current-1);play()});
 document.querySelector("#heroNext")?.addEventListener("click",()=>{show(current+1);play()});
 dots.forEach((dot,i)=>dot.addEventListener("click",()=>{show(i);play()}));
 root.addEventListener("mouseenter",()=>{paused=true;stop()});
 root.addEventListener("mouseleave",()=>{paused=false;play()});
 root.addEventListener("focusin",()=>{paused=true;stop()});
 root.addEventListener("focusout",()=>{paused=false;play()});
 play();
})();

/* Mobile categories sheet */
(()=>{const m=$("#categoryMenu"),b=$("#mobileCats");
 const open=()=>{m.classList.toggle("show")};
 b?.addEventListener("click",open);
 if(location.hash==="#categories"&&innerWidth<=700)setTimeout(()=>m.classList.add("show"),300);
 document.addEventListener("click",e=>{if(innerWidth<=700&&m.classList.contains("show")&&!m.contains(e.target)&&!(b&&b.contains(e.target))&&e.target.id!=="categoryToggle")m.classList.remove("show")});
})();
/* Fixed mobile navigation */
(()=> {
 const cartButton=$("#mobileCart"),loginButton=$("#mobileLogin"),count=$("#cartCount"),mobileCount=$("#mobileCartCount");
 cartButton?.addEventListener("click",openCart);
 loginButton?.addEventListener("click",()=>location.href="account.html");
 if(count&&mobileCount){new MutationObserver(()=>mobileCount.textContent=count.textContent).observe(count,{childList:true,characterData:true,subtree:true});mobileCount.textContent=count.textContent;}
})();

/* Accepted banks marquee: duplicate once for a seamless right-to-left loop */
document.querySelectorAll(".bank-track").forEach(t=>{[...t.children].forEach(c=>{const n=c.cloneNode(true);n.setAttribute("aria-hidden","true");t.appendChild(n)})});

/* Smooth scroll-reveal for every section (runs on every page load) */
(()=>{
 const sel=".category-section,.products-section .section-head,.filter-chips,.why-section,.reviews-section .section-head,.faq-section,.contact-band .contact-inner,.footer-main,.bank-marquee";
 const stag=".category-card,.review-card,.benefits>div,.faq-list details";
 const els=[...document.querySelectorAll(sel)];
 document.querySelectorAll(stag).forEach(e=>{e.parentElement&&[...e.parentElement.children].indexOf(e)>-1&&(e.style.setProperty("--rd",Math.min([...e.parentElement.children].indexOf(e),8)*70+"ms"),els.push(e))});
 window.__csRevealOk=true;
 if(!("IntersectionObserver" in window)){document.documentElement.classList.remove("cs-js");return}
 els.forEach(e=>e.classList.add("reveal"));
 const io=new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting){en.target.classList.add("in");io.unobserve(en.target)}}),{threshold:.08,rootMargin:"0px 0px -6% 0px"});
 els.forEach(e=>io.observe(e));
})();
