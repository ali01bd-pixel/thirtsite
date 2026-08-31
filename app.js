(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
  const esc = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c]));
  const mulberry32 = a => () => {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };

  const state = {
    posterCount:5,designMode:"blueModern",shapeSize:100,density:8,gradientSoftness:70,
    spacing:24,edgeFade:32,textAmount:60,seed:260831,format:"portrait",quality:"large",
    darkColor:"#080e33",lightColor:"#9ac8f2"
  };
  let generated=[],zoom=1;

  function dims(){
    const base={portrait:{w:1200,h:1800},square:{w:1600,h:1600},landscape:{w:1800,h:1200}}[state.format];
    const q={standard:1,large:1.35,xl:1.8}[state.quality];
    return {w:Math.round(base.w*q),h:Math.round(base.h*q)};
  }
  function hexToRgb(hex){
    const s=hex.replace("#",""),v=parseInt(s.length===3?s.split("").map(x=>x+x).join(""):s,16);
    return {r:(v>>16)&255,g:(v>>8)&255,b:v&255};
  }
  function mixHex(a,b,t){
    const A=hexToRgb(a),B=hexToRgb(b);
    const c=[0,1,2].map(k=>Math.round(A[["r","g","b"][k]]*(1-t)+B[["r","g","b"][k]]*t));
    return "#"+c.map(x=>x.toString(16).padStart(2,"0")).join("");
  }
  function sizeFactor(){ return clamp(Number(state.shapeSize)/100,.35,1.5); }

  function palette(index){
    const seed=Number(state.seed)||1;
    const variants=[
      ["#05082a","#1b2f8f","#548fe2","#b7dcff"],
      ["#070a31","#17357f","#4f8edc","#b8e1ff"],
      ["#06102f","#203b95","#70a8ef","#d1eaff"],
      ["#090d38","#2444a1","#5c95e6","#bfdbf7"],
      ["#050727","#183277","#6a9ce4","#c5e0fa"]
    ];
    const p=variants[(Math.floor(seed/11)+index)%variants.length];
    return {dark:state.darkColor||p[0],mid:p[1],blue:p[2],light:state.lightColor||p[3]};
  }

  function commonDefs(id,p){
    return `<defs>
      <linearGradient id="${id}_bg" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${p.dark}"/>
        <stop offset="42%" stop-color="${p.mid}"/>
        <stop offset="78%" stop-color="${p.blue}"/>
        <stop offset="100%" stop-color="${p.light}"/>
      </linearGradient>
      <linearGradient id="${id}_orb" x1="20%" y1="90%" x2="85%" y2="10%">
        <stop offset="0%" stop-color="${p.blue}"/>
        <stop offset="58%" stop-color="${p.light}"/>
        <stop offset="100%" stop-color="#edf7ff"/>
      </linearGradient>
      <radialGradient id="${id}_dark" cx="28%" cy="24%" r="80%">
        <stop offset="0%" stop-color="${p.mid}"/>
        <stop offset="70%" stop-color="${p.dark}"/>
        <stop offset="100%" stop-color="#02051b"/>
      </radialGradient>
      <linearGradient id="${id}_bar" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${p.blue}"/>
        <stop offset="55%" stop-color="${p.light}"/>
        <stop offset="100%" stop-color="${p.mid}"/>
      </linearGradient>
      <filter id="${id}_soft" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="${Math.max(2,5+(100-state.gradientSoftness)*.20)}"/>
      </filter>
      <filter id="${id}_shadow" x="-35%" y="-35%" width="170%" height="170%">
        <feDropShadow dx="0" dy="${Math.max(2,8*sizeFactor())}" stdDeviation="${Math.max(4,10*sizeFactor())}" flood-color="#02051a" flood-opacity=".46"/>
      </filter>
    </defs>`;
  }

  function modernLayout(index,w,h,p,rnd){
    const s=sizeFactor(), gap=state.spacing/100, fade=state.edgeFade/100;
    const id=`m${Number(state.seed)||1}_${index}`;
    let out=commonDefs(id,p);
    out += `<rect width="${w}" height="${h}" fill="url(#${id}_bg)"/>`;

    // Five coordinated compositions derived from the user's reference.
    if(index%5===0){
      // 1) Vertical bubble grid.
      const cols=4, rows=7;
      const cellW=w/(cols+1), cellH=h/(rows+0.8);
      const r=Math.min(cellW,cellH)*.42*s*(.83+(.17*(1-gap)));
      for(let row=0;row<rows;row++){
        for(let col=0;col<cols;col++){
          const x=cellW*(col+1)+Math.sin(row*.9+index)*cellW*.035;
          const y=cellH*(row+.56)+Math.cos(col*1.6)*cellH*.018;
          const fill=(row+col)%3===0?`url(#${id}_orb)`:((row+col)%3===1?`url(#${id}_bar)`:p.blue);
          out+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" opacity=".95" filter="url(#${id}_shadow)"/>`;
        }
      }
    }else if(index%5===1){
      // 2) Large rounded horizontal ribbon bars.
      const barH=h*.18*s, x=w*.08, width=w*.84;
      const ys=[.22,.42,.62,.82];
      ys.forEach((yy,i)=>{
        const y=h*yy-barH/2;
        const dx=(i%2? -1:1)*(w*.08*gap);
        out+=`<rect x="${(x+dx).toFixed(1)}" y="${y.toFixed(1)}" width="${width.toFixed(1)}" height="${barH.toFixed(1)}" rx="${(barH*.48).toFixed(1)}" fill="${i%2?'url(#'+id+'_bar)':'url(#'+id+'_orb)'}" opacity=".94"/>`;
      });
    }else if(index%5===2){
      // 3) Oversized overlapping spheres.
      const circles=[
        [.22,.22,.18],[.64,.21,.25],[.77,.50,.22],[.34,.70,.25],[.76,.78,.17],[.20,.53,.11]
      ];
      circles.forEach((c,i)=>{
        const [px,py,pr]=c;
        const x=w*px,y=h*py,r=Math.min(w,h)*pr*s;
        const fill=i%2?`url(#${id}_orb)`:`url(#${id}_dark)`;
        out+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" filter="${i===1?'url(#'+id+'_shadow)':''}" opacity=".98"/>`;
      });
      out+=`<circle cx="${w*.51}" cy="${h*.40}" r="${(Math.min(w,h)*.055*s).toFixed(1)}" fill="${p.light}" opacity=".92"/>`;
    }else if(index%5===3){
      // 4) Vertical gradient bars / modern cover.
      const bars=state.density+3, bw=w/(bars*1.65), baseY=h*.95;
      for(let i=0;i<bars;i++){
        const x=w*.12+i*(w*.76/(bars-1));
        const bh=h*(.16+.055*i)*(0.80+.18*rnd())*s;
        const top=baseY-bh;
        const opacity=.40+(i%3)*.17;
        out+=`<rect x="${(x-bw/2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="url(#${id}_orb)" opacity="${opacity.toFixed(2)}"/>`;
        out+=`<rect x="${(x-bw*.33).toFixed(1)}" y="${(top+bh*.20).toFixed(1)}" width="${(bw*.66).toFixed(1)}" height="${(bh*.7).toFixed(1)}" fill="${p.dark}" opacity=".10"/>`;
      }
      out+=`<rect x="0" y="${(h*.72).toFixed(1)}" width="${w}" height="${(h*.28).toFixed(1)}" fill="url(#${id}_bg)" opacity=".58"/>`;
    }else{
      // 5) Organic/petal petal-ring composition.
      const cx=w*.51,cy=h*.54,R=Math.min(w,h)*.31*s;
      const petals=6;
      for(let i=0;i<petals;i++){
        const a=i*Math.PI*2/petals-.15;
        const x=cx+Math.cos(a)*R*.55,y=cy+Math.sin(a)*R*.60;
        const rx=R*.72,ry=R*.38;
        const rot=a*180/Math.PI+20;
        out+=`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${i%2?'url(#'+id+'_orb)':'url(#'+id+'_dark)'}" opacity=".94"/>`;
      }
      out+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(R*.55).toFixed(1)}" fill="url(#${id}_dark)"/>`;
    }

    // Subtle soft light at an edge for depth.
    if(fade>0){
      out+=`<ellipse cx="${w*(.08+rnd()*.15)}" cy="${h*(.12+rnd()*.18)}" rx="${w*.28}" ry="${h*.18}" fill="${p.light}" opacity="${(.10+fade*.10).toFixed(2)}" filter="url(#${id}_soft)"/>`;
      out+=`<ellipse cx="${w*(.84+rnd()*.08)}" cy="${h*(.75+rnd()*.12)}" rx="${w*.25}" ry="${h*.19}" fill="${p.blue}" opacity="${(.09+fade*.08).toFixed(2)}" filter="url(#${id}_soft)"/>`;
    }

    // Editorial text as SVG text: remains editable as text in Illustrator.
    if(Number(state.textAmount)>0){
      const amount=Number(state.textAmount)/100;
      const title=["INSPIRATION","COVER DESIGN","DESIGN INSPIRATION","MODERN COVER","MODERN ART"][index%5];
      const tiny=["FORM / VOLUME","POSTER SERIES","DESIGN STUDY","BLUE SYSTEM","VISUAL ART"][index%5];
      const fs=Math.max(16,Math.round(Math.min(w,h)*.028));
      out+=`<g font-family="Arial, Helvetica, sans-serif" fill="#ffffff" opacity="${(.80+.18*amount).toFixed(2)}">
        <text x="${(w*.10).toFixed(1)}" y="${(h*.12).toFixed(1)}" font-size="${fs}" font-weight="700" letter-spacing="${Math.max(2,fs*.20).toFixed(1)}">${esc(title)}</text>
        <text x="${(w*.10).toFixed(1)}" y="${(h*.15).toFixed(1)}" font-size="${Math.round(fs*.38)}" letter-spacing="${Math.max(1,fs*.07).toFixed(1)}">${esc(tiny)}</text>
        <text x="${(w*.10).toFixed(1)}" y="${(h*.91).toFixed(1)}" font-size="${Math.round(fs*.38)}" font-weight="600" letter-spacing="${Math.max(1,fs*.08).toFixed(1)}">DESIGN / ${String(index+1).padStart(2,"0")}</text>
        <text x="${(w*.10).toFixed(1)}" y="${(h*.935).toFixed(1)}" font-size="${Math.round(fs*.30)}" letter-spacing="${Math.max(1,fs*.06).toFixed(1)}">BLUE GRADIENT SERIES</text>
      </g>`;
    }
    return out;
  }

  function makeSvg(index){
    const {w,h}=dims();
    const rnd=mulberry32((Number(state.seed)||1)+index*9973);
    const p=palette(index);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<title>ALI STUDIO — Blue Gradient Modern ${String(index+1).padStart(2,"0")}</title>
<metadata>Generated locally by ALI STUDIO. All visible shapes are SVG elements.</metadata>
${modernLayout(index,w,h,p,rnd)}
</svg>`;
  }

  function makeCombinedSvg(){
    const {w:pw,h:ph}=dims();
    const count=Number(state.posterCount);
    const cols=Math.min(5,Math.max(1,count));
    const rows=Math.ceil(count/cols);
    const gap=36;
    const aw=pw*cols+gap*(cols+1), ah=ph*rows+gap*(rows+1);
    let out=`<svg xmlns="http://www.w3.org/2000/svg" width="${aw}" height="${ah}" viewBox="0 0 ${aw} ${ah}">
<title>ALI STUDIO — Blue Gradient Modern Collection</title><rect width="${aw}" height="${ah}" fill="#d5d5d5"/>`;
    for(let i=0;i<count;i++){
      const x=gap+(i%cols)*(pw+gap), y=gap+Math.floor(i/cols)*(ph+gap);
      out+=`<g id="poster_${String(i+1).padStart(2,"0")}" transform="translate(${x} ${y})">${modernLayout(i,pw,ph,palette(i),mulberry32((Number(state.seed)||1)+i*9973))}</g>`;
    }
    out+="</svg>";
    return out;
  }

  function download(filename,content,mime="image/svg+xml"){
    const blob=new Blob([content],{type:mime}),a=document.createElement("a");
    a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  async function copyText(text){
    try{await navigator.clipboard.writeText(text);alert("SVG copied to clipboard.");}
    catch{const ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();alert("SVG copied to clipboard.");}
  }
  function updateOutputs(){
    const map={shapeSize:["shapeSizeVal",v=>v+"%"],density:["densityVal",v=>v],gradientSoftness:["gradientSoftnessVal",v=>v+"%"],spacing:["spacingVal",v=>v+"%"],edgeFade:["edgeFadeVal",v=>v+"%"],textAmount:["textAmountVal",v=>v+"%"]};
    Object.entries(map).forEach(([id,[oid,fn]])=>$(oid).textContent=fn($(id).value));
  }
  function readControls(){
    const numeric=["posterCount","shapeSize","density","gradientSoftness","spacing","edgeFade","textAmount"];
    ["posterCount","designMode","shapeSize","density","gradientSoftness","spacing","edgeFade","textAmount","format","quality","darkColor","lightColor"].forEach(k=>{
      const el=$(k); state[k]=numeric.includes(k)?Number(el.value):el.value;
    });
    state.seed=Number($("seed").value)||1;
  }
  function render(){
    readControls();
    generated=[];
    const grid=$("posterGrid");grid.innerHTML="";
    const tpl=$("posterTemplate");
    for(let i=0;i<state.posterCount;i++){
      const node=tpl.content.firstElementChild.cloneNode(true),svg=makeSvg(i);
      generated.push(svg);
      node.querySelector(".poster-number").textContent=`POSTER ${String(i+1).padStart(2,"0")}`;
      node.querySelector(".poster-frame").innerHTML=svg;
      node.querySelector(".download-one").addEventListener("click",()=>download(`ali-studio-blue-modern-${String(i+1).padStart(2,"0")}.svg`,svg));
      node.querySelector(".copy-one").addEventListener("click",()=>copyText(svg));
      grid.appendChild(node);
    }
    grid.style.gridTemplateColumns=`repeat(${Math.min(5,state.posterCount)},minmax(0,1fr))`;
    applyZoom();
  }
  function applyZoom(){ $("posterGrid").style.transform=`scale(${zoom})`;$("zoomLabel").textContent=`${Math.round(zoom*100)}%`; }

  ["posterCount","designMode","shapeSize","density","gradientSoftness","spacing","edgeFade","textAmount","seed","format","quality","darkColor","lightColor"].forEach(id=>{
    $(id).addEventListener("input",()=>{updateOutputs();render()});
    $(id).addEventListener("change",()=>{updateOutputs();render()});
  });
  $("regenerate").addEventListener("click",render);
  $("randomize").addEventListener("click",()=>{
    $("seed").value=Math.floor(Math.random()*9999999)+1;
    $("shapeSize").value=55+Math.floor(Math.random()*81);
    $("density").value=5+Math.floor(Math.random()*11);
    $("gradientSoftness").value=50+Math.floor(Math.random()*51);
    $("spacing").value=10+Math.floor(Math.random()*46);
    $("edgeFade").value=10+Math.floor(Math.random()*61);
    updateOutputs();render();
  });
  $("downloadAll").addEventListener("click",()=>download("ali-studio-blue-gradient-modern-all.svg",makeCombinedSvg()));
  $("downloadJson").addEventListener("click",()=>download("ali-studio-blue-modern-settings.json",JSON.stringify(state,null,2),"application/json"));
  $("zoomIn").addEventListener("click",()=>{zoom=clamp(zoom+.1,.5,1.8);applyZoom()});
  $("zoomOut").addEventListener("click",()=>{zoom=clamp(zoom-.1,.5,1.8);applyZoom()});

  updateOutputs();render();
})();
