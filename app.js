(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const posterGrid = $("posterGrid");
  const template = $("posterTemplate");

  const defaults = {
    posterCount: 4,
    designMode: "retroBubble",
    density: 10,
    frequency: 28,
    thickness: 2,
    amplitude: 135,
    phase: 45,
    chaos: 45,
    seed: 260830,
    format: "portrait",
    quality: "large",
    artboardColumns: 4,
    artboardGap: 24,
    bgColor: "#3b0065",
    strokeColor: "#f8f0ff",
    strokeOpacity: 38
  };

  let state = {...defaults};
  let zoom = 1;
  let generated = [];

  const palettes = [
    ["#3b0065","#ffeb0b","#8cff16","#d96b12"],
    ["#1437c9","#13326a","#194ee4","#25a1dd"],
    ["#ec5b1c","#c52448","#0b6a40","#e74821"],
    ["#a3d80c","#55dc13","#7ecb0a","#a52708"],
    ["#101f55","#7c48e2","#ef3d91","#17b7e5"],
    ["#f45b0c","#ffb31a","#087c65","#ec3779"]
  ];

  function mulberry32(a){
    return function(){
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
  const esc = (s)=>String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c]));

  function dims(){
    const map = {
      portrait:{w:1200,h:1800},
      square:{w:1600,h:1600},
      landscape:{w:1800,h:1200}
    };
    const quality = {standard:1,large:1.35,xl:1.8}[state.quality];
    const d = map[state.format];
    return {w:Math.round(d.w*quality),h:Math.round(d.h*quality)};
  }

  function hexToRgba(hex,a){
    const n = hex.replace("#","");
    const v = parseInt(n.length===3 ? n.split("").map(x=>x+x).join("") : n,16);
    return `rgba(${(v>>16)&255},${(v>>8)&255},${v&255},${a})`;
  }

  function makeBlob(cx,cy,r,fill,opacity,stroke="",sw=0,seed=1){
    const rnd = mulberry32(seed);
    const points = clamp(Math.round(12 + state.chaos/8), 12, 26);
    const amp = r * (0.05 + state.chaos/1200);
    const arr = [];
    for(let i=0;i<points;i++){
      const a = (Math.PI*2*i)/points;
      const rr = r + (rnd()-0.5)*amp;
      arr.push([cx+Math.cos(a)*rr, cy+Math.sin(a)*rr]);
    }
    let d=`M ${arr[0][0].toFixed(1)} ${arr[0][1].toFixed(1)} `;
    for(let i=1;i<arr.length;i++) d += `L ${arr[i][0].toFixed(1)} ${arr[i][1].toFixed(1)} `;
    d += "Z";
    return `<path d="${d}" fill="${fill}" fill-opacity="${opacity}" ${stroke?`stroke="${stroke}" stroke-opacity="${aClamp(state.strokeOpacity)}" stroke-width="${sw}"`: ""}/>`;
  }
  function aClamp(v){return clamp(v/100,0,1)}

  function addBackground(w,h,bg,colors,seed){
    const rnd = mulberry32(seed + 17);
    const id = `bg_${Math.abs(seed)}_${w}_${h}`;
    const c1 = bg || colors[0];
    const c2 = colors[(Math.floor(rnd()*colors.length)) % colors.length];
    const c3 = colors[(Math.floor(rnd()*colors.length)) % colors.length];
    const c4 = colors[(Math.floor(rnd()*colors.length)) % colors.length];
    const angle = Math.round(95 + rnd()*75);

    // Vibrant multi-stop gradient + soft radial highlights.
    return `<defs>
      <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(${angle/.9})">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="34%" stop-color="${c2}"/>
        <stop offset="67%" stop-color="${c3}"/>
        <stop offset="100%" stop-color="${c4}"/>
      </linearGradient>
      <radialGradient id="${id}_glow1" cx="${20+rnd()*35}%" cy="${10+rnd()*35}%" r="70%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity=".14"/>
        <stop offset="55%" stop-color="#ffffff" stop-opacity=".025"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${id}_glow2" cx="${65+rnd()*25}%" cy="${60+rnd()*28}%" r="66%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity=".10"/>
        <stop offset="55%" stop-color="#ffffff" stop-opacity=".02"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#${id})"/>
    <rect width="${w}" height="${h}" fill="url(#${id}_glow1)"/>
    <rect width="${w}" height="${h}" fill="url(#${id}_glow2)"/>`;
  }

  function svgSizeForCombined(){
    const base = dims();
    const count = Math.max(1, Number(state.posterCount) || 1);
    let cols = clamp(Number(state.artboardColumns)||4, 1, 4);
    cols = Math.min(cols, count);
    const rows = Math.ceil(count / cols);
    const gap = Math.max(0, Number(state.artboardGap)||24);

    const artW = base.w * cols + gap * (cols + 1);
    const artH = base.h * rows + gap * (rows + 1);
    return {baseW:base.w, baseH:base.h, cols, rows, gap, artW, artH};
  }

  function makeCombinedSvg(){
    const layout = svgSizeForCombined();
    const {artW,artH,baseW,baseH,cols,gap} = layout;
    const artboardBg = "#f6f6f7";
    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${artW}" height="${artH}" viewBox="0 0 ${artW} ${artH}">`,
      `<title>ALI STUDIO — Combined SVG Artboard</title>`,
      `<desc>${state.posterCount} editable SVG poster designs arranged on one artboard.</desc>`,
      `<rect width="${artW}" height="${artH}" fill="${artboardBg}"/>`
    ];

    for(let i=0;i<Number(state.posterCount);i++){
      const row = Math.floor(i/cols);
      const col = i%cols;
      const x = gap + col*(baseW+gap);
      const y = gap + row*(baseH+gap);
      parts.push(`<g id="poster_${String(i+1).padStart(2,"0")}" transform="translate(${x} ${y})">${makePosterContents(i)}</g>`);
    }
    parts.push("</svg>");
    return parts.join("");
  }



  function modeRetroBubble(w,h,colors,rnd){
    const out = [];
    const count = state.density;
    const baseR = Math.min(w,h) * (0.11 + state.amplitude/1800);
    for(let i=0;i<count;i++){
      const edge = i%3===0;
      const cx = edge ? rnd()*w*1.25-w*.12 : rnd()*w;
      const cy = edge ? rnd()*h*1.20-h*.10 : rnd()*h;
      const r = baseR*(0.55+rnd()*1.2);
      const fill = colors[i%colors.length];
      out.push(makeBlob(cx,cy,r,fill,.88,"",0,Math.floor(rnd()*1e9)));
      if(state.thickness>0){
        const rings = 1 + Math.floor(state.frequency/35);
        for(let k=1;k<=rings;k++){
          out.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r*(1+k*.08)).toFixed(1)}" fill="none" stroke="${state.strokeColor}" stroke-opacity="${aClamp(state.strokeOpacity)}" stroke-width="${state.thickness}"/>`);
        }
      }
    }
    return out.join("");
  }

  function modeWatercolor(w,h,colors,rnd){
    const out=[];
    const count=state.density+3;
    for(let i=0;i<count;i++){
      const cx=rnd()*w, cy=rnd()*h, r=Math.min(w,h)*(0.09+rnd()*0.17);
      const gradId=`wg${i}`;
      out.push(`<defs><radialGradient id="${gradId}"><stop offset="0%" stop-color="${colors[i%colors.length]}" stop-opacity=".88"/><stop offset="65%" stop-color="${colors[i%colors.length]}" stop-opacity=".62"/><stop offset="100%" stop-color="${colors[i%colors.length]}" stop-opacity=".2"/></radialGradient></defs>`);
      out.push(makeBlob(cx,cy,r,`url(#${gradId})`,1,state.strokeColor,state.thickness,Math.floor(rnd()*1e9)));
      const washCount=3+Math.floor(state.chaos/30);
      for(let j=1;j<washCount;j++){
        out.push(`<circle cx="${(cx+(rnd()-.5)*r*.22).toFixed(1)}" cy="${(cy+(rnd()-.5)*r*.22).toFixed(1)}" r="${(r*(1+j*.055)).toFixed(1)}" fill="none" stroke="${state.strokeColor}" stroke-opacity="${aClamp(state.strokeOpacity*.4)}" stroke-width="${Math.max(1,state.thickness*.7)}"/>`);
      }
    }
    return out.join("");
  }

  function modeSoftBlob(w,h,colors,rnd){
    let out="";
    for(let i=0;i<state.density+2;i++){
      const cx=rnd()*w, cy=rnd()*h, r=Math.min(w,h)*(0.1+rnd()*0.18);
      out += makeBlob(cx,cy,r,colors[i%colors.length],.78,state.strokeColor,state.thickness,Math.floor(rnd()*1e9));
    }
    return out;
  }

  function modeMandala(w,h,colors,rnd){
    let out="";
    const cx=w/2, cy=h/2;
    const layers=clamp(Math.round(state.density/2),3,14);
    const arms=clamp(6+Math.round(state.frequency/10),6,18);
    for(let L=1;L<=layers;L++){
      const r=(Math.min(w,h)*.04)+(L/layers)*Math.min(w,h)*.43;
      const rot=(state.phase + L*state.chaos*.9)*Math.PI/180;
      for(let a=0;a<arms;a++){
        const ang=(Math.PI*2*a/arms)+rot;
        const x=cx+Math.cos(ang)*r*.72;
        const y=cy+Math.sin(ang)*r*.72;
        const rr=Math.min(w,h)*(0.018+(state.amplitude/4000));
        out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr.toFixed(1)}" fill="${colors[L%colors.length]}" fill-opacity=".72" stroke="${state.strokeColor}" stroke-opacity="${aClamp(state.strokeOpacity)}" stroke-width="${Math.max(.5,state.thickness)}"/>`;
      }
      out += `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="${state.strokeColor}" stroke-opacity="${aClamp(state.strokeOpacity)}" stroke-width="${Math.max(.5,state.thickness)}"/>`;
    }
    out += `<circle cx="${cx}" cy="${cy}" r="${Math.min(w,h)*.04}" fill="${colors[0]}"/>`;
    return out;
  }

  function modeRetroWave(w,h,colors,rnd){
    let out="";
    const lines=clamp(state.density+4,6,32);
    const amp=Math.min(w,h)*(state.amplitude/500);
    for(let i=0;i<lines;i++){
      const y0=(i/(lines-1))*h;
      let d=`M 0 ${y0.toFixed(1)}`;
      for(let x=0;x<=w;x+=Math.max(30,w/28)){
        const t=x/w*Math.PI*2*(1+state.frequency/25)+state.phase*Math.PI/180;
        const y=y0+Math.sin(t+i*.45)*(amp*(.22+.78*state.frequency/100)) + Math.cos(t*.5+i)*amp*.12;
        d+=` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      out+=`<path d="${d}" fill="none" stroke="${colors[i%colors.length]}" stroke-width="${1+state.thickness*.55}" stroke-opacity=".82"/>`;
    }
    return out;
  }

  function modeMinimal(w,h,colors,rnd){
    let out="";
    for(let i=0;i<state.density;i++){
      const cx=rnd()*w, cy=rnd()*h, r=Math.min(w,h)*(.06+rnd()*.16);
      out += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${colors[i%colors.length]}" stroke-width="${Math.max(1,state.thickness)}" stroke-opacity=".9"/>`;
    }
    return out;
  }

  function modeGeometric(w,h,colors,rnd){
    let out="";
    const n=state.density+2;
    for(let i=0;i<n;i++){
      const size=Math.min(w,h)*(.08+rnd()*.22), x=rnd()*w, y=rnd()*h;
      const rot=(state.phase + rnd()*state.chaos*3).toFixed(1);
      out += `<rect x="${(x-size/2).toFixed(1)}" y="${(y-size/2).toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" transform="rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${colors[i%colors.length]}" fill-opacity=".76" stroke="${state.strokeColor}" stroke-opacity="${aClamp(state.strokeOpacity)}" stroke-width="${state.thickness}"/>`;
    }
    return out;
  }

  function makePosterContents(index){
    const {w,h}=dims();
    const baseSeed=Number(state.seed)||1;
    const rnd=mulberry32(baseSeed + index*10091);
    const palette = palettes[(Math.floor(baseSeed/7)+index)%palettes.length];

    // Use the selected background as a base, while automatically blending it
    // with palette colors to create a vivid background that matches the artwork.
    let shapes="";
    switch(state.designMode){
      case "watercolorBubble": shapes=modeWatercolor(w,h,palette,rnd); break;
      case "watercolorBlobs": shapes=modeWatercolorBlobs(w,h,palette,rnd); break;
      case "watercolorFluid": shapes=modeWatercolorFluid(w,h,palette,rnd); break;
      case "shapesWatercolor": shapes=modeShapesWatercolor(w,h,palette,rnd); break;
      case "organicShapesWatercolor": shapes=modeOrganicShapesWatercolor(w,h,palette,rnd); break;
      case "circlesWatercolor": shapes=modeCirclesWatercolor(w,h,palette,rnd); break;
      case "splashesWatercolor": shapes=modeSplashesWatercolor(w,h,palette,rnd); break;
      case "washesWatercolor": shapes=modeWashesWatercolor(w,h,palette,rnd); break;
      case "marblingWatercolor": shapes=modeMarblingWatercolor(w,h,palette,rnd); break;
      case "swirlsWatercolor": shapes=modeSwirlsWatercolor(w,h,palette,rnd); break;
      case "wavesWatercolor": shapes=modeWavesWatercolor(w,h,palette,rnd); break;
      case "dotsWatercolor": shapes=modeDotsWatercolor(w,h,palette,rnd); break;
      case "confettiWatercolor": shapes=modeConfettiWatercolor(w,h,palette,rnd); break;
      case "galaxyWatercolor": shapes=modeGalaxyWatercolor(w,h,palette,rnd); break;
      case "botanicalWatercolor": shapes=modeBotanicalWatercolor(w,h,palette,rnd); break;
      case "abstractShapes": shapes=modeAbstractShapes(w,h,palette,rnd); break;
      case "softBlob": shapes=modeSoftBlob(w,h,palette,rnd); break;
      case "mandala": shapes=modeMandala(w,h,palette,rnd); break;
      case "retroWave": shapes=modeRetroWave(w,h,palette,rnd); break;
      case "minimalCircles": shapes=modeMinimal(w,h,palette,rnd); break;
      case "geometric": shapes=modeGeometric(w,h,palette,rnd); break;
      default: shapes=modeRetroBubble(w,h,palette,rnd);
    }
    return `${addBackground(w,h,state.bgColor,palette,baseSeed+index*37)}${shapes}`;
  }

  function makeSvg(index){
    const {w,h}=dims();
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <title>ALI STUDIO SVG Poster ${String(index+1).padStart(2,"0")}</title>
  <metadata>Generated locally by ALI STUDIO SVG Design Lab. Seed ${esc(state.seed)}.</metadata>
  ${makePosterContents(index)}
</svg>`;
  }


  function download(filename, content, mime="image/svg+xml"){
    const blob = new Blob([content],{type:mime});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  async function copyText(text){
    try{
      await navigator.clipboard.writeText(text);
      alert("SVG copied to clipboard.");
    }catch{
      const ta=document.createElement("textarea");
      ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();
      alert("SVG copied to clipboard.");
    }
  }

  function render(){
    state.posterCount=Number($("posterCount").value);
    posterGrid.innerHTML="";
    generated=[];
    for(let i=0;i<state.posterCount;i++){
      const node=template.content.firstElementChild.cloneNode(true);
      node.querySelector(".poster-number").textContent=`POSTER ${String(i+1).padStart(2,"0")}`;
      const svg=makeSvg(i);
      generated.push(svg);
      node.querySelector(".poster-frame").innerHTML=svg;
      node.querySelector(".download-one").addEventListener("click",()=>download(`ali-studio-poster-${String(i+1).padStart(2,"0")}.svg`,generated[i]));
      node.querySelector(".copy-one").addEventListener("click",()=>copyText(generated[i]));
      posterGrid.appendChild(node);
    }
    applyZoom();
  }

  function applyZoom(){
    posterGrid.style.transform=`scale(${zoom})`;
    $("zoomLabel").textContent=`${Math.round(zoom*100)}%`;
  }

  function updateOutputs(){
    const map={
      density:["densityVal",v=>v],
      frequency:["frequencyVal",v=>v+"%"],
      thickness:["thicknessVal",v=>v+"PX"],
      amplitude:["amplitudeVal",v=>v+"%"],
      phase:["phaseVal",v=>v+"°"],
      strokeOpacity:["strokeOpacityVal",v=>v+"%"]
    };
    for(const [id,[out,fmt]] of Object.entries(map)) $(out).textContent=fmt($(id).value);
  }

  function readControls(){
    for(const key of ["posterCount","designMode","density","frequency","thickness","amplitude","phase","chaos","format","quality","bgColor","strokeColor","strokeOpacity"]){
      const el=$(key);
      const numericKeys=["posterCount","density","frequency","shapeSize","thickness","amplitude","phase","chaos","strokeOpacity","artboardColumns","artboardGap"];
      state[key]=el.type==="range"||el.tagName==="SELECT" ? (numericKeys.includes(key)?Number(el.value):el.value) : el.value;
    }
    state.seed=Number($("seed").value)||1;
  }

  function bind(){
    ["posterCount","designMode","density","frequency","thickness","amplitude","phase","chaos","seed","format","quality","bgColor","strokeColor","strokeOpacity"].forEach(id=>{
      const el=$(id);
      el.addEventListener("input",()=>{
        readControls();updateOutputs();
        if(id!=="posterCount") render(); else render();
      });
      el.addEventListener("change",()=>{readControls();updateOutputs();render()});
    });

    $("regenerate").addEventListener("click",()=>{readControls();render()});
    $("randomize").addEventListener("click",()=>{
      $("seed").value=Math.floor(Math.random()*9999999)+1;
      $("phase").value=Math.floor(Math.random()*361);
      $("chaos").value=Math.floor(Math.random()*101);
      $("density").value=5+Math.floor(Math.random()*15);
      $("frequency").value=Math.floor(Math.random()*81);
      $("amplitude").value=80+Math.floor(Math.random()*121);
      readControls();updateOutputs();render();
    });
    $("downloadAll").addEventListener("click",()=>{
      const combined = makeCombinedSvg();
      download(`ali-studio-all-posters-one-artboard.svg`, combined);
    });
    $("downloadJson").addEventListener("click",()=>download("ali-studio-settings.json",JSON.stringify({...state},null,2),"application/json"));
    $("zoomIn").addEventListener("click",()=>{zoom=clamp(zoom+.1,.5,1.8);applyZoom()});
    $("zoomOut").addEventListener("click",()=>{zoom=clamp(zoom-.1,.5,1.8);applyZoom()});
  }

  // Load defaults into controls
  for(const [k,v] of Object.entries(defaults)){
    if($(k)) $(k).value=v;
  }
  bind();
  updateOutputs();
  readControls();
  render();
})();
