/* LinkSharp — affichage des signaux (accueil + page Signaux), en français ou en anglais selon <html lang>.
   Données : signaux.js */
(function(){
  var data = window.SIGNAUX; if(!data || !data.semaines || !data.semaines.length) return;
  var EN = (document.documentElement.lang || "fr").slice(0,2) === "en";
  var L = EN ? {
    mail:"The email, ready to send", subject:"Subject: ", source:"Source: ", first:"The first email",
    to:"To: ", fit:"Good timing for:", thisweek:"This week, published ", published:"Published "
  } : {
    mail:"Le mail, prêt à partir", subject:"Objet : ", source:"Source : ", first:"Le premier mail",
    to:"À : ", fit:"Bon moment pour :", thisweek:"Cette semaine, publiée le ", published:"Publiée le "
  };
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function v(o,k){ return EN && o.en && o.en[k] != null ? o.en[k] : o[k]; }
  function jour(s){ if(EN && s.en && s.en.date){ return s.en.date.split(" ").slice(0,2).join(" "); } var p=s.date.split("/"); return p[0]+"/"+p[1]; }

  /* Accueil : le fil de la semaine, cliquable */
  var feed = document.getElementById("feed");
  if(feed){
    var sem = data.semaines[0], items = sem.signaux.slice(0,3);
    feed.querySelector(".feed-week").textContent = v(sem,"court");
    var list = feed.querySelector(".feed-list"), mail = feed.querySelector(".feed-mail");
    list.innerHTML = items.map(function(s,i){
      return '<li style="--i:'+i+'"><button type="button" aria-pressed="'+(i===0)+'" data-i="'+i+'">'+
        '<span class="d">'+esc(jour(s))+'</span><span class="e">'+esc(s.entreprise)+' <small>'+esc(v(s,"lieu"))+'</small></span>'+
        '<span class="r">'+esc(v(s,"resume"))+'</span></button></li>';
    }).join("");
    function show(i){
      var s = items[i];
      list.querySelectorAll("button").forEach(function(b){ b.setAttribute("aria-pressed", String(+b.dataset.i===i)); });
      mail.innerHTML = '<div class="k">'+L.mail+'</div><div class="o">'+L.subject+esc(v(s,"objet"))+'</div><p>'+esc(v(s,"accroche"))+'</p>'+
        '<div class="s">'+L.source+'<a href="'+esc(s.source.url)+'" rel="noopener" target="_blank">'+esc(s.source.nom)+'</a>, '+esc(v(s,"date"))+'</div>';
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
        '<div class="week-head"><h2>'+esc(v(sem,"titre"))+'</h2><span>'+(k===0?L.thisweek:L.published)+esc(v(sem,"publie"))+'</span></div>'+
        sem.signaux.map(function(s){
          return '<article class="sg">'+
            '<div class="sg-meta"><span class="t">'+esc(v(s,"type"))+'</span><span>'+esc(v(s,"date"))+'</span><span>'+esc(v(s,"lieu"))+'</span></div>'+
            '<div class="sg-body"><h3>'+esc(s.entreprise)+'</h3><p class="sec">'+esc(v(s,"secteur"))+'</p><p>'+esc(v(s,"quoi"))+'</p>'+
              '<p class="fit"><b>'+L.fit+'</b> '+esc(v(s,"qui"))+'</p>'+
              '<p class="src">'+L.source+'<a class="link" href="'+esc(s.source.url)+'" rel="noopener" target="_blank">'+esc(s.source.nom)+'</a></p></div>'+
            '<div class="sg-mail"><div class="k">'+L.first+'</div><div class="o">'+L.subject+esc(v(s,"objet"))+'</div><p>'+esc(v(s,"accroche"))+'</p><div class="to">'+L.to+esc(v(s,"contact"))+'</div></div>'+
          '</article>';
        }).join("")+
      '</div></section>';
    }).join("");
  }
})();
