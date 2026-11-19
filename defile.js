// Défilement automatique et doux des avis ; on peut aussi faire glisser à la main.
(function(){
  var box=document.querySelector(".avis"); if(!box) return;
  var track=box.querySelector(".avis-track");
  track.innerHTML+=track.innerHTML;                       // contenu doublé pour boucler sans saut
  track.querySelectorAll("figure").forEach(function(f,i,a){ if(i>=a.length/2) f.setAttribute("aria-hidden","true"); });
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var pause=false, x=0, last=null, vitesse=28;            // pixels par seconde
  ["mouseenter","touchstart","focusin"].forEach(function(e){ box.addEventListener(e,function(){pause=true},{passive:true}); });
  ["mouseleave","touchend","focusout"].forEach(function(e){ box.addEventListener(e,function(){pause=false; x=box.scrollLeft},{passive:true}); });
  function pas(t){
    if(last!==null && !pause){
      x+=vitesse*(t-last)/1000;
      var moitie=track.scrollWidth/2; if(x>=moitie) x-=moitie;
      box.scrollLeft=x;
    }
    last=t; requestAnimationFrame(pas);
  }
  requestAnimationFrame(pas);
})();
