(window.CS_READY||Promise.resolve()).then(()=>{
const products=window.CS_PRODUCTS||[];
const params=new URLSearchParams(location.search),id=Number(params.get("id"));
const p=products.find(x=>x.id===id),root=document.getElementById("buyPageContent");
const money=n=>"NPR "+Number(n).toLocaleString("en-IN");
const WA_NUMBER="9779716537747";
document.getElementById("year").textContent=new Date().getFullYear();
if(!p){
 root.innerHTML='<div class="buy-not-found"><h1>Product not found</h1><p>Please return to the store and choose a product.</p><a href="index.html#shop">Back to all products →</a></div>';
}else{
 document.title="Buy "+p.name+" | CheapSewa.Store";
 document.getElementById("crumbName").textContent=p.name;
 root.innerHTML=`<div class="buy-layout">
 <div class="buy-art"><img class="buy-art-img" src="${p.img}" alt="${p.name}"><div class="buy-art-caption">CheapSewa.Store · Premium digital access</div></div>
 <div class="buy-info"><span class="eyebrow">${p.cat.toUpperCase()}</span><h1>${p.name}</h1>
 <p class="buy-description">${p.desc} Choose your plan, then continue to pay.</p>
 <div class="buy-price-hint">1. Select your subscription plan</div>
 <div class="buy-plans">${p.plans.map((plan,i)=>`<label class="buy-plan"><span><strong>${plan[0]}</strong><small>${i===0?"Available plan":"Digital subscription plan"}</small></span><b>${money(plan[1])}</b><input type="radio" name="chosenPlan" value="${i}" ${i===0?"checked":""}></label>`).join("")}</div>
 <form id="productOrderForm" novalidate>
  <div class="buy-price-hint">2. Your details</div>
  <div class="product-order-fields"><label>Full name<input name="name" required placeholder="Your name"></label><label>Phone number<input name="phone" required inputmode="tel" placeholder="98XXXXXXXX"></label></div>
  <button class="primary-btn full" type="button" id="productContinue">Continue to amount <span>→</span></button>
 </form>
 <div class="buy-trust"><span>🇳🇵 Made for Nepal</span><span>🔒 Verify before paying</span><span>💳 Local payment options</span></div>
 <div class="buy-help"><b>Payment help</b><br>eSewa · Khalti · Fonepay · Bank transfer<br><a href="https://wa.me/${WA_NUMBER}" target="_blank" rel="noopener">Need help? WhatsApp support: 9716537747</a></div>
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
 const $=id=>document.getElementById(id);
 if(p.inStock===false){const b=$("productContinue");b.disabled=true;b.innerHTML="Out of stock";b.style.opacity=".55";b.insertAdjacentHTML("beforebegin","<p style=\"color:#d9464e;font-weight:700;margin:10px 0\">This product is currently out of stock. Please check back soon.</p>")}
 const form=$("productOrderForm"),modal=$("pModal"),overlay=$("pOverlay"),pForm=$("pForm");
 const stepMethod=$("pStepMethod"),stepPay=$("pStepPay");
 const chosen=()=>p.plans[Number(document.querySelector('input[name="chosenPlan"]:checked').value)];
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
  $("pSummary").innerHTML=`<div><span>${p.name} · ${plan[0]} × 1</span><b>${money(plan[1])}</b></div><hr><div><b>Total</b><b>${money(plan[1])}</b></div>`;
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
   $("pFinal").textContent=e.target.value+" selected · Amount due: "+money(chosen()[1]);
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
   const id=await window.CSOrder.submit({name:form.elements.name.value,phone:form.elements.phone.value,product:p.name,plan:chosen()[0],amount:chosen()[1],productId:p.id,method:method?method.value:""},file);
   stop();
   const msg=`Hello CheapSewa! I have paid.\nOrder ID: ${id}\nProduct: ${p.name} (${chosen()[0]})\nTotal: ${money(chosen()[1])}`;
   const host=document.createElement("div");host.className="cs-done-host";
   const modalBody=btn.closest("form")||pForm;modalBody.innerHTML="";modalBody.appendChild(host);
   window.CSOrder.done(host,id,{phone:form.elements.phone.value,wa:"https://wa.me/"+WA_NUMBER+"?text="+encodeURIComponent(msg)});
  }catch(err){
   console.error(err);btn.disabled=false;btn.innerHTML="Verify payment <span>→</span>";
   alert((err&&err.message)||"Could not save your order. Please try again.");
  }
 };
 document.getElementById("mobileCart")?.addEventListener("click",()=>location.href="index.html#shop");
 document.getElementById("mobileLogin")?.addEventListener("click",()=>location.href="account.html");
}

});
