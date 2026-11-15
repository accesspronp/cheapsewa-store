(window.CS_READY||Promise.resolve()).then(()=>{
const products=window.CS_PRODUCTS||[];
const params=new URLSearchParams(location.search),id=Number(params.get("id"));
const p=products.find(x=>x.id===id),root=document.getElementById("buyPageContent");
const money=CS.money,esc=CS.esc;
const WA_NUMBER="9779717647043";
document.getElementById("year").textContent=new Date().getFullYear();
if(!p){
 root.innerHTML='<div class="buy-not-found"><h1>Product not found</h1><p>Please return to the store and choose a product.</p><a href="index.html#shop">Back to all products →</a></div>';
}else{
 document.title="Buy "+p.name+" | CheapSewa.Store";
 const firstOk=Math.max(0,p.plans.findIndex(CS.planOk)),allOut=!CS.prodOk(p);
 document.getElementById("crumbName").textContent=p.name;
 root.innerHTML=`<div class="buy-layout">
 <div class="buy-art">${CS.img(p,"buy-art-img")}${allOut?"":CS.pillHtml(p)}<div class="buy-art-caption">CheapSewa.Store · Premium digital access</div></div>
 <div class="buy-info">${p.badge?`<span class="buy-badge">${esc(p.badge)}</span><br>`:""}<span class="eyebrow">${esc(p.cat).toUpperCase()}</span><h1>${esc(p.name)}</h1>
 <p class="buy-description">${esc(p.desc)} Choose your plan, then add it to your cart or buy it now.</p>
 <div id="modeBox"></div><div class="buy-plans" id="planList"></div>
 <div class="instant-note"><span class="instant-ic">⚡</span><div><b>Instant delivery after payment</b><small>Pay, send your screenshot and your subscription is delivered right away. Need help? <a href="mailto:support@cheapsewa.store">support@cheapsewa.store</a></small></div></div>
 <div class="buy-actions"><button class="primary-btn full" type="button" id="addToCartBtn">Add to cart +</button><a class="cart-link" href="index.html#cart" id="goCart">View cart (<span id="cartN">0</span>)</a></div>
 <div class="buy-or">or buy this plan right now</div>
 <form id="productOrderForm" novalidate>
  <div class="buy-price-hint">Your details</div>
  <div class="product-order-fields"><label>Full name<input name="name" required placeholder="Your name"></label><label>Phone number<input name="phone" required inputmode="tel" placeholder="98XXXXXXXX"></label></div>
  <button class="primary-btn full" type="button" id="productContinue">Continue to amount <span>→</span></button>
 </form>
 <div class="buy-trust"><span>⚡ Instant delivery after payment</span><span>🇳🇵 Made for Nepal</span><span>🔒 Verify before paying</span><span>💳 Local payment options</span></div>
 <div class="buy-help"><b>Payment help</b><br>eSewa · Khalti · Fonepay · Bank transfer<br><a href="https://wa.me/${WA_NUMBER}" target="_blank" rel="noopener">Need help? WhatsApp support: 9717647043</a><br><a href="mailto:support@cheapsewa.store">✉ support@cheapsewa.store</a></div>
 </div></div>
 <div class="overlay" id="pOverlay"></div>
 <div class="modal checkout-modal" id="pModal" role="dialog" aria-modal="true" aria-label="Checkout">
  <button class="close modal-close" type="button" id="pClose" aria-label="Close">×</button>
  <span class="eyebrow">SECURE ORDER REQUEST</span><h2>Checkout</h2>
  <div class="checkout-summary" id="pSummary"></div>
  <form id="pForm" novalidate>
   <section class="pay-step is-active" id="pStepMethod">
    <h3>Choose payment method</h3>
    <div class="payment-options">
     <label class="payment-option"><input type="radio" name="payment" value="eSewa"><img src="assets/esewa-logo.png" alt="eSewa"><b>eSewa</b></label>
     <label class="payment-option"><input type="radio" name="payment" value="Khalti"><img src="assets/khalti-logo.png" alt="Khalti"><b>Khalti</b></label>
     <label class="payment-option"><input type="radio" name="payment" value="Fonepay"><img src="assets/fonepay-logo.png" alt="Fonepay"><b>Fonepay</b></label>
     <label class="payment-option"><input type="radio" name="payment" value="Bank Transfer"><span class="bank-symbol">▤</span><b>Bank transfer</b></label>
    </div>
    <p class="payment-note">Pick a method to see the payment QR. You'll have 15 minutes to pay.</p>
   </section>
   <section class="pay-step" id="pStepPay" hidden>
    <div class="payment-final-summary" id="pFinal"></div>
    <div class="shared-qr-card product-qr-card"><div><span class="eyebrow">CHEAPSEWA PAYMENT QR</span><h3>Scan to pay</h3><p>Scan with your selected payment app and check the recipient before sending.</p></div><img class="shared-payment-qr" src="assets/payment-qr.png" alt="CheapSewa.Store payment QR code"><a class="qr-download-btn" href="assets/payment-qr.png" download="CheapSewa-payment-QR.png">↓ Download QR</a></div>
    <div class="payment-countdown"><span>Time remaining to pay</span><strong id="pCountdown">15:00</strong></div>
    <button class="text-btn change-payment" type="button" id="pChange">← Change payment method</button>
    <div class="expired-note" id="pExpired" hidden>Time expired. Select the payment method again to restart the 15-minute session.</div>
    <div class="proof-panel"><h3>Upload your payment screenshot</h3><p>After paying, upload the screenshot here, then tap Verify payment.</p>
     <label class="wide product-field">Payment screenshot<input type="file" id="pProof" accept="image/*" required></label>
     <button class="primary-btn full" type="button" id="pVerify" disabled>Verify payment <span>→</span></button>
    </div>
    <small class="form-disclaimer">WhatsApp will open with your order details. Attach the same screenshot in the chat and send. Our team confirms your payment there.</small>
   </section>
  </form>
 </div>`;

 /* ---- Sharing / Private switch + plan list ---- */
 const MODES=(Array.isArray(p.modes)&&p.modes.length&&p.plans.every(pl=>p.modes.some(m=>pl[0].indexOf(m+" · ")===0)))?p.modes:null;
 const modeOf=pl=>MODES?MODES.find(m=>pl[0].indexOf(m+" · ")===0):"";
 let curMode=MODES?(MODES.find(m=>p.plans.some(pl=>modeOf(pl)===m&&CS.planOk(pl)))||MODES[0]):"";
 const planShown=pl=>MODES?pl[0].slice(modeOf(pl).length+3):pl[0];
 function drawPlans(){
  const idx=p.plans.map((pl,i)=>i).filter(i=>!MODES||modeOf(p.plans[i])===curMode);
  const first=idx.find(i=>CS.planOk(p.plans[i]));
  document.getElementById("planList").innerHTML=idx.map(i=>{const plan=p.plans[i],ok=CS.planOk(plan),sale=CS.onSale(plan);return `<label class="buy-plan${ok?"":" is-oos"}"><span><strong>${esc(planShown(plan))}${sale&&ok?`<em class="sale-chip">Save ${CS.pct(plan)}%</em>`:""}${ok?"":'<em class="oos-chip">Out of stock</em>'}</strong><small>${ok?(i===first?"Popular choice":"Digital subscription plan"):"Currently unavailable"}</small></span><span class="plan-price">${sale?`<s>${money(plan[1])}</s>`:""}<b>${money(CS.eff(plan))}</b></span><input type="radio" name="chosenPlan" value="${i}" ${i===first?"checked":""} ${ok?"":"disabled"}></label>`}).join("");
 }
 function drawModes(){
  const box=document.getElementById("modeBox");
  if(!MODES){box.innerHTML="";return}
  box.innerHTML=`<div class="buy-price-hint">Choose account type</div><div class="mode-switch" role="tablist">${MODES.map(m=>`<button type="button" role="tab" class="mode-btn${m===curMode?" is-on":""}" data-mode="${esc(m)}" aria-selected="${m===curMode}">${esc(m)}</button>`).join("")}</div><p class="mode-note" id="modeNote">${esc((p.modeNotes||{})[curMode]||"")}</p><div class="buy-price-hint">Select your plan</div>`;
  box.querySelectorAll(".mode-btn").forEach(b=>b.onclick=()=>{if(curMode===b.dataset.mode)return;curMode=b.dataset.mode;drawModes();const l=document.getElementById("planList");l.classList.remove("swap");void l.offsetWidth;drawPlans();l.classList.add("swap")});
 }
 if(!MODES)document.getElementById("modeBox").innerHTML='<div class="buy-price-hint">Select your plan</div>';
 drawModes();drawPlans();
 const $=id=>document.getElementById(id);
 if(allOut){const b=$("productContinue");b.disabled=true;b.innerHTML="Out of stock";b.style.opacity=".55";$("addToCartBtn").disabled=true;$("addToCartBtn").textContent="Out of stock";b.insertAdjacentHTML("beforebegin","<p style=\"color:#d9464e;font-weight:700;margin:10px 0\">This product is currently out of stock. Please check back soon.</p>")}
 const upCount=()=>{$("cartN").textContent=CS.cart.count();const mc=document.getElementById("mobileCartCount");if(mc)mc.textContent=CS.cart.count();const hc=document.getElementById("hdrCart");if(hc)hc.textContent="Cart ("+CS.cart.count()+")"};
 upCount();document.addEventListener("cs-cart",upCount);
 let tt;const toast=t=>{let el=document.getElementById("toast");if(!el){el=document.createElement("div");el.id="toast";el.className="toast";document.body.appendChild(el)}el.textContent=t;el.classList.add("show");clearTimeout(tt);tt=setTimeout(()=>el.classList.remove("show"),2400)};
 $("addToCartBtn").onclick=()=>{if(allOut)return;const plan=chosen();if(!CS.planOk(plan)){toast("This plan is out of stock");return}CS.cart.add(p.id,plan[0],1);toast("Added to cart: "+p.name+" · "+plan[0])};
 const form=$("productOrderForm"),modal=$("pModal"),overlay=$("pOverlay"),pForm=$("pForm");
 const stepMethod=$("pStepMethod"),stepPay=$("pStepPay");
 const chosen=()=>{const r=document.querySelector('input[name="chosenPlan"]:checked');return p.plans[r?Number(r.value):firstOk]};
 let timer=null,seconds=900,expired=false;
 const stop=()=>{if(timer){clearInterval(timer);timer=null}};
 const tick=()=>$("pCountdown").textContent=String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");
 const showStep=n=>{stepMethod.hidden=n!==1;stepPay.hidden=n!==2;stepMethod.classList.toggle("is-active",n===1);stepPay.classList.toggle("is-active",n===2);modal.scrollTo({top:0})};
 const startTimer=()=>{
  stop();seconds=900;expired=false;$("pExpired").hidden=true;$("pProof").disabled=false;$("pProof").value="";$("pVerify").disabled=true;tick();
  timer=setInterval(()=>{seconds--;tick();if(seconds<=0){stop();expired=true;$("pExpired").hidden=false;$("pProof").disabled=true;$("pVerify").disabled=true}},1000);
 };
 const openModal=()=>{
  const plan=chosen();
  $("pSummary").innerHTML=`<div><span>${esc(p.name)} · ${esc(plan[0])} × 1</span><b>${money(CS.eff(plan))}</b></div><hr><div><b>Total</b><b>${money(CS.eff(plan))}</b></div>`;
  pForm.reset();stop();showStep(1);
  overlay.classList.add("show");modal.classList.add("show");
 };
 const closeModal=()=>{stop();overlay.classList.remove("show");modal.classList.remove("show")};
 $("productContinue").onclick=()=>{if(form.elements.name.reportValidity()&&form.elements.phone.reportValidity())openModal()};
 $("pClose").onclick=closeModal;overlay.onclick=closeModal;
 document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});
 $("pChange").onclick=()=>{stop();pForm.reset();showStep(1)};
 pForm.addEventListener("change",e=>{
  if(e.target.name==="payment"){
   $("pFinal").textContent=e.target.value+" selected · Amount due: "+money(CS.eff(chosen()));
   showStep(2);startTimer();
  }
 });
 $("pProof").onchange=e=>{$("pVerify").disabled=!(e.target.files&&e.target.files[0]&&e.target.files[0].type.startsWith("image/"))||expired};
 $("pVerify").onclick=async()=>{
  if(expired){alert("Your 15-minute payment session expired.");return}
  const file=$("pProof").files[0];
  if(!file){alert("Please upload your payment screenshot first.");return}
  const method=pForm.querySelector('input[name="payment"]:checked');
  const btn=$("pVerify");btn.disabled=true;btn.textContent="Saving your order…";
  try{
   const id=await window.CSOrder.submit({name:form.elements.name.value,phone:form.elements.phone.value,product:p.name,plan:chosen()[0],amount:CS.eff(chosen()),items:[{id:p.id,plan:chosen()[0],qty:1}],coupon:"",method:method?method.value:""},file);
   stop();
   const msg=`Hello CheapSewa! I have paid.\nOrder ID: ${id}\nProduct: ${p.name} (${chosen()[0]})\nTotal: ${money(CS.eff(chosen()))}`;
   const host=document.createElement("div");host.className="cs-done-host";
   const modalBody=btn.closest("form")||pForm;modalBody.innerHTML="";modalBody.appendChild(host);
   window.CSOrder.done(host,id,{phone:form.elements.phone.value,wa:"https://wa.me/"+WA_NUMBER+"?text="+encodeURIComponent(msg)});
  }catch(err){
   console.error(err);btn.disabled=false;btn.innerHTML="Verify payment <span>→</span>";
   alert((err&&err.message)||"Could not save your order. Please try again.");
  }
 };
 document.getElementById("mobileCart")?.addEventListener("click",()=>location.href="index.html#cart");
 document.getElementById("mobileLogin")?.addEventListener("click",()=>location.href="account.html");
}

});
