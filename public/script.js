const products=window.CS_PRODUCTS;
let cart=[],activeCategory="All",selectedProduct=null;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const money=n=>"NPR "+Number(n).toLocaleString("en-IN");
function toast(t){const el=$("#toast");el.textContent=t;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2300)}
function renderProducts(){let list=products.filter(p=>(activeCategory==="All"||p.cat===activeCategory||(activeCategory==="Design"&&p.cat==="Design"))&&(`${p.name} ${p.cat} ${p.desc}`).toLowerCase().includes($("#searchInput").value.toLowerCase()));const sort=$("#sortSelect").value;if(sort==="low")list.sort((a,b)=>Math.min(...a.plans.map(x=>x[1]))-Math.min(...b.plans.map(x=>x[1])));if(sort==="high")list.sort((a,b)=>Math.min(...b.plans.map(x=>x[1]))-Math.min(...a.plans.map(x=>x[1])));if(sort==="az")list.sort((a,b)=>a.name.localeCompare(b.name));$("#productGrid").innerHTML=list.map(p=>`<article class="product-card"><a class="product-card-link" href="product.html?id=${p.id}" aria-label="View ${p.name} plans"><div class="product-art" style="--art:${p.color}"><span class="product-cat">${p.cat}</span>${p.inStock===false?'<span class="oos">Out of stock</span>':''}<div class="product-symbol" style="color:${p.color}">${p.symbol}</div></div><div class="product-body"><h3>${p.name}</h3><p>${p.desc}</p><div class="product-foot"><span class="price">${money(Math.min(...p.plans.map(x=>x[1])))}<small>Starting price</small></span><span class="add-btn">View plans +</span></div></div></a></article>`).join("");$("#emptyState").hidden=!!list.length;}
function setCategory(c){activeCategory=c;$$("[data-cat]").forEach(b=>b.classList.toggle("active",b.dataset.cat===c));renderProducts();$("#categoryMenu").classList.remove("show");document.querySelector("#shop").scrollIntoView({behavior:"smooth"})}
function openProduct(id){selectedProduct=products.find(p=>p.id===id);$("#productModalBody").innerHTML=`<div class="modal-product-head"><div class="modal-product-symbol" style="color:${selectedProduct.color}">${selectedProduct.symbol}</div><div><h2>${selectedProduct.name}</h2><p>${selectedProduct.desc}</p></div></div><span class="eyebrow">CHOOSE YOUR PLAN</span><div class="plan-list">${selectedProduct.plans.map((pl,i)=>`<label class="plan-choice"><span><b>${pl[0]}</b><small>${i===0?"Popular choice":"Digital subscription plan"}</small></span><strong>${money(pl[1])}</strong><input type="radio" name="plan" value="${i}" ${i===0?"checked":""}></label>`).join("")}</div><button class="primary-btn full" id="addSelected">Add to cart <span>➜</span></button>`;showModal("#productModal");$("#addSelected").onclick=()=>{let i=+$('input[name="plan"]:checked').value;addCart(selectedProduct,selectedProduct.plans[i]);closeModals()}}
function addCart(p,plan){if(p.inStock===false){toast("Sorry, this product is out of stock");return}let key=p.id+"-"+plan[0],item=cart.find(x=>x.key===key);if(item)item.qty++;else cart.push({key,id:p.id,name:p.name,plan:plan[0],price:plan[1],qty:1});renderCart();toast("Added to cart")}
function renderCart(){let count=cart.reduce((s,x)=>s+x.qty,0),total=cart.reduce((s,x)=>s+x.price*x.qty,0);$("#cartCount").textContent=count;$("#drawerCount").textContent="("+count+")";$("#cartTotal").textContent=money(total);$("#cartItems").innerHTML=cart.length?cart.map(x=>`<div class="cart-row"><div><b>${x.name}</b><small>${x.plan} · ${money(x.price)}</small><small>${money(x.price*x.qty)}</small></div><div class="qty"><button data-dec="${x.key}">−</button><b>${x.qty}</b><button data-inc="${x.key}">+</button></div></div>`).join(""):'<div class="empty-state">Your cart is empty.<br>Explore products to get started.</div>';$$("[data-inc]").forEach(b=>b.onclick=()=>{cart.find(x=>x.key===b.dataset.inc).qty++;renderCart()});$$("[data-dec]").forEach(b=>b.onclick=()=>{let x=cart.find(x=>x.key===b.dataset.dec);x.qty--;if(x.qty<=0)cart=cart.filter(y=>y!==x);renderCart()})}
function openCart(){closeModals();$("#cartDrawer").classList.add("open");$("#overlay").classList.add("show")}
function showModal(id){$("#overlay").classList.add("show");$(id).classList.add("show")}
function closeModals(){$("#overlay").classList.remove("show");$("#cartDrawer").classList.remove("open");$$(".modal").forEach(m=>m.classList.remove("show"))}
let paymentTimer=null,paymentSeconds=900,paymentExpired=false;
function totalCart(){return cart.reduce((sum,item)=>sum+item.price*item.qty,0)}
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
 if(!cart.length){toast("Your cart is empty");return}
 const total=totalCart();
 $("#checkoutSummary").innerHTML=`<div class="checkout-summary">${cart.map(x=>`<div><span>${x.name} · ${x.plan} × ${x.qty}</span><b>${money(x.price*x.qty)}</b></div>`).join("")}<hr><div><b>Total</b><b>${money(total)}</b></div></div>`;
 $("#amountConfirmation").innerHTML=`<div class="amount-line"><span>Selected items</span><b>${cart.reduce((s,x)=>s+x.qty,0)}</b></div><div class="amount-line amount-grand"><span>Amount to pay</span><strong>${money(total)}</strong></div>`;
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
 const items=cart.map(x=>`${x.name} (${x.plan}) x ${x.qty}`).join(", ");
 const btn=$("#checkoutVerifyBtn");btn.disabled=true;btn.textContent="Saving your order…";
 try{
  const id=await window.CSOrder.submit({name:fd.get("name"),phone:fd.get("phone"),product:items,plan:"Cart order",amount:totalCart(),method:fd.get("payment"),productIds:cart.map(x=>x.id)},file);
  stopPaymentTimer();
  const msg=`Hello CheapSewa! I have paid.\nOrder ID: ${id}\nName: ${fd.get("name")}\nTotal: ${money(totalCart())}`;
  const phone=fd.get("phone");cart=[];renderCart();
  window.CSOrder.done($("#checkoutStep4"),id,{phone:phone,wa:"https://wa.me/9779716537747?text="+encodeURIComponent(msg)});
 }catch(err){
  console.error(err);btn.disabled=false;btn.innerHTML="Verify payment <span>→</span>";
  alert((err&&err.message)||"Could not save your order. Please try again.");
 }
});
$("#searchInput").addEventListener("input",renderProducts);$("#sortSelect").addEventListener("change",renderProducts);$("#openCart").onclick=openCart;$("#checkoutBtn").onclick=checkout;$("#overlay").onclick=closeModals;$$("[data-close]").forEach(b=>b.onclick=closeModals);
$("#categoryToggle").onclick=()=>$("#categoryMenu").classList.toggle("show");$("#categoryMenu").querySelectorAll("button").forEach(b=>b.onclick=()=>setCategory(b.dataset.cat));$$(".category-card").forEach(b=>b.onclick=()=>setCategory(b.dataset.cat));$$(".filter-chips button").forEach(b=>b.onclick=()=>setCategory(b.dataset.cat));$("#loginBtn").onclick=()=>location.href="account.html";$("#hamb").onclick=()=>$("#navlinks").classList.toggle("open");$("#year").textContent=new Date().getFullYear();
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModals();if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("#searchInput").focus()}});
(window.CS_READY||Promise.resolve()).then(()=>{renderProducts();renderCart()});

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
