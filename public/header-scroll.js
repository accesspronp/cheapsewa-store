/* Hide the "All Categories" bar while scrolling down, show it again when scrolling up */
(function(){
  var header=document.querySelector(".header"),nav=header&&header.querySelector(".nav");
  if(!header||!nav)return;
  var hidden=false,last=window.pageYOffset||0,ticking=false;
  nav.style.overflow="hidden";
  function hide(){
    if(hidden)return;hidden=true;
    var h=nav.offsetHeight;
    nav.style.maxHeight=h+"px";nav.getBoundingClientRect();
    header.style.marginBottom=h+"px";           /* keeps the page from jumping */
    nav.style.maxHeight="0px";nav.style.opacity="0";
    var m=document.getElementById("categoryMenu");if(m)m.classList.remove("show");
  }
  function show(){
    if(!hidden)return;hidden=false;
    header.style.marginBottom="0px";
    nav.style.maxHeight=nav.scrollHeight+"px";nav.style.opacity="1";
    setTimeout(function(){if(!hidden)nav.style.maxHeight=""},350);
  }
  function check(){
    ticking=false;
    var y=window.pageYOffset||0;
    if(y>110&&y>last+4)hide();
    else if(y<last-4||y<=40)show();
    last=y;
  }
  window.addEventListener("scroll",function(){if(!ticking){ticking=true;requestAnimationFrame(check)}},{passive:true});
})();
