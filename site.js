/* LinkSharp — affichage des signaux (accueil + page Signaux). Données : signaux.js */
(function(){
  var data = window.SIGNAUX; if(!data || !data.semaines || !data.semaines.length) return;
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function jour(d){ var p=d.split("/"); return p[0]+"/"+p[1]; }

  /* Accueil : le fil de la semaine, cliquable */
  var feed = document.getElementById("feed");
  if(feed){
    var sem = data.semaines[0], items = sem.signaux.slice(0,3);
    feed.querySelector(".feed-week").textContent = sem.court;
    var list = feed.querySelector(".feed-list"), mail = feed.querySelector(".feed-mail");
    list.innerHTML = items.map(function(s,i){
      return '<li style="--i:'+i+'"><button type="button" aria-pressed="'+(i===0)+'" data-i="'+i+'">'+
        '<span class="d">'+jour(s.date)+'</span><span class="e">'+esc(s.entreprise)+' <small>'+esc(s.lieu)+'</small></span>'+
        '<span class="r">'+esc(s.resume)+'</span></button></li>';
    }).join("");
    function show(i){
      var s = items[i];
      list.querySelectorAll("button").forEach(function(b){ b.setAttribute("aria-pressed", String(+b.dataset.i===i)); });
      mail.innerHTML = '<div class="k">Le mail, prêt à partir</div><div class="o">Objet : '+esc(s.objet)+'</div><p>'+esc(s.accroche)+'</p>'+
        '<div class="s">Source : <a href="'+esc(s.source.url)+'" rel="noopener" target="_blank">'+esc(s.source.nom)+'</a>, '+esc(s.date)+'</div>';
    }
    list.addEventListener("click",function(e){ var b=e.target.closest("button"); if(b) show(+b.dataset.i); });
    show(0);
    feed.classList.add("ready");
  }

  /* Page Signaux : toutes les semaines */
  var page = document.getElementById("signaux");
  if(page){
    page.innerHTML = data.semaines.map(function(sem,k){
      return '<section class="week'+(k===0?" current":"")+'" id="'+esc(sem.id)+'"><div class="wide">'+
        '<div class="week-head"><h2>'+esc(sem.titre)+'</h2><span>'+(k===0?"Cette semaine, publiée le ":"Publiée le ")+''+esc(sem.publie)+'</span></div>'+
        sem.signaux.map(function(s){
          return '<article class="sg">'+
            '<div class="sg-meta"><span class="t">'+esc(s.type)+'</span><span>'+esc(s.date)+'</span><span>'+esc(s.lieu)+'</span></div>'+
            '<div class="sg-body"><h3>'+esc(s.entreprise)+'</h3><p class="sec">'+esc(s.secteur)+'</p><p>'+esc(s.quoi)+'</p>'+
              '<p class="fit"><b>Bon moment pour :</b> '+esc(s.qui)+'</p>'+
              '<p class="src">Source : <a class="link" href="'+esc(s.source.url)+'" rel="noopener" target="_blank">'+esc(s.source.nom)+'</a></p></div>'+
            '<div class="sg-mail"><div class="k">Le premier mail</div><div class="o">Objet : '+esc(s.objet)+'</div><p>'+esc(s.accroche)+'</p><div class="to">À : '+esc(s.contact)+'</div></div>'+
          '</article>';
        }).join("")+
      '</div></section>';
    }).join("");
  }
})();
