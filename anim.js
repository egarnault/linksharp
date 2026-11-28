/* LinkSharp : menu, apparitions au défilement, compteurs. Respecte prefers-reduced-motion. */
(function(){
  var d = document, root = d.documentElement;
  var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* En-tête : ombre une fois la page défilée */
  var sh = d.querySelector(".sh");
  function onScroll(){ if(sh) sh.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, {passive:true}); onScroll();

  /* Méga-menu : ouverture au clic (tactile, clavier), fermeture dehors ou Échap */
  var menus = d.querySelectorAll(".mm");
  function closeAll(except){ menus.forEach(function(m){ if(m!==except){ m.classList.remove("open"); var b=m.querySelector(".mm-btn"); if(b) b.setAttribute("aria-expanded","false"); } }); }
  menus.forEach(function(m){
    var b = m.querySelector(".mm-btn"); if(!b) return;
    b.setAttribute("aria-expanded","false");
    b.addEventListener("click", function(e){ e.stopPropagation(); var o = !m.classList.contains("open"); closeAll(m); m.classList.toggle("open", o); b.setAttribute("aria-expanded", String(o)); });
  });
  d.addEventListener("click", function(e){ if(!e.target.closest(".mm")) closeAll(); });
  d.addEventListener("keydown", function(e){ if(e.key === "Escape") closeAll(); });

  /* Apparitions et compteurs */
  var items = d.querySelectorAll("[data-r], .stats dt[data-n]");
  if(still || !("IntersectionObserver" in window)){ items.forEach(function(el){ el.classList.add("in"); }); return; }
  root.classList.add("anim");
  function count(el){
    var n = +el.dataset.n, t0 = null, dur = 900;
    function step(t){ if(!t0) t0 = t; var p = Math.min(1, (t - t0) / dur); el.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))); if(p < 1) requestAnimationFrame(step); }
    el.textContent = "0"; requestAnimationFrame(step);
  }
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(!e.isIntersecting) return;
      e.target.classList.add("in");
      if(e.target.dataset.n) count(e.target);
      io.unobserve(e.target);
    });
  }, {threshold:.25, rootMargin:"0px 0px -40px 0px"});
  items.forEach(function(el){ io.observe(el); });
})();
