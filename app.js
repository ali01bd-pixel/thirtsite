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
    shapeSize: 100,
    thickness: 2,
    amplitude: 135,
    phase: 45,
    chaos: 45,
    seed: 260830,
    format: "portrait",
    quality: "large",
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

  function shapeFactor(){
    // 100% = default. Lower values make all generated forms smaller.
    return clamp(Number(state.shapeSize || 100) / 100, 0.2, 1.6);
  }

  function scaledR(base){
    return base * shapeFactor();
  }

  function watercolorGradient(id, color, rnd, strength=1){
    const x1 = (18 + rnd()*28).toFixed(1);
    const y1 = (12 + rnd()*25).toFixed(1);
    const x2 = (75 + rnd()*22).toFixed(1);
    const y2 = (78 + rnd()*18).toFixed(1);
    return `<radialGradient id="${id}" cx="${x1}%" cy="${y1}%" r="90%" fx="${x2}%" fy="${y2}%">
      <stop offset="0%" stop-color="${color}" stop-opacity="${(.82*strength).toFixed(2)}"/>
      <stop offset="52%" stop-color="${color}" stop-opacity="${(.53*strength).toFixed(2)}"/>
      <stop offset="82%" stop-color="${color}" stop-opacity="${(.25*strength).toFixed(2)}"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </radialGradient>`;
  }

  function irregularEllipse(cx,cy,rx,ry,fill,opacity,rnd,seed){
    const pts = clamp(14 + Math.round(state.chaos/6), 14, 30);
    const rng = mulberry32(seed);
    let d = "";
    for(let i=0;i<pts;i++){
      const a = (Math.PI*2*i)/pts;
      const jitter = 1 + (rng()-.5)*(.16 + state.chaos/420);
      const x = cx + Math.cos(a)*rx*jitter;
      const y = cy + Math.sin(a)*ry*jitter;
      d += `${i===0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    d += "Z";
    return `<path d="${d}" fill="${fill}" fill-opacity="${opacity}"/>`;
  }

  function paperTexture(id){
    return `<filter id="${id}" x="-15%" y="-15%" width="130%" height="130%">
      <feTurbulence type="fractalNoise" baseFrequency=".014" numOctaves="3" seed="${id.length*17}" result="noise"/>
      <feColorMatrix in="noise" type="saturate" values="0" result="mono"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 .11"/>
      </feComponentTransfer>
      <feBlend in="SourceGraphic" in2="mono" mode="multiply"/>
    </filter>`;
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

  function addBackground(w,h,bg){
    return `<rect width="${w}" height="${h}" fill="${bg}"/>`;
  }

  function modeRetroBubble(w,h,colors,rnd){
    const out = [];
    const count = state.density;
    const baseR = Math.min(w,h) * (0.11 + state.amplitude/1800) * shapeFactor();
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
      const cx=rnd()*w, cy=rnd()*h;
      const r=scaledR(Math.min(w,h)*(0.075+rnd()*0.15));
      const gradId=`wg${i}_${Math.abs(Math.floor(rnd()*1e8))}`;
      out.push(`<defs>${watercolorGradient(gradId,colors[i%colors.length],rnd)}</defs>`);
      out.push(makeBlob(cx,cy,r,`url(#${gradId})`,1,state.strokeColor,state.thickness,Math.floor(rnd()*1e9)));
      const washCount=2+Math.floor(state.frequency/28);
      for(let j=1;j<washCount;j++){
        out.push(`<circle cx="${(cx+(rnd()-.5)*r*.18).toFixed(1)}" cy="${(cy+(rnd()-.5)*r*.18).toFixed(1)}"
          r="${(r*(1+j*.055)).toFixed(1)}" fill="none" stroke="${state.strokeColor}"
          stroke-opacity="${aClamp(state.strokeOpacity*.32)}" stroke-width="${Math.max(1,state.thickness*.65)}"/>`);
      }
    }
    return out.join("");
  }

  function modeWatercolorBlobs(w,h,colors,rnd){
    let out = `<defs>${paperTexture("blobPaper")}</defs><g filter="url(#blobPaper)">`;
    for(let i=0;i<state.density+1;i++){
      const cx=rnd()*w, cy=rnd()*h;
      const rx=scaledR(Math.min(w,h)*(.06+rnd()*.12));
      const ry=rx*(.62+rnd()*.72);
      const c=colors[i%colors.length];
      out += irregularEllipse(cx,cy,rx,ry,c,.72+.16*rnd(),rnd,Math.floor(rnd()*1e9));
      if(state.thickness){
        out += `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}"
          fill="none" stroke="${state.strokeColor}" stroke-opacity="${aClamp(state.strokeOpacity*.55)}" stroke-width="${state.thickness}"/>`;
      }
    }
    return out+"</g>";
  }

  function modeWatercolorFluid(w,h,colors,rnd){
    let out="";
    const bands=Math.max(3,Math.round(state.density*.65));
    const amp=scaledR(Math.min(w,h)*(.05+state.amplitude/3000));
    for(let i=0;i<bands;i++){
      const y0=(i/(bands-1))*h;
      let d=`M 0 ${y0.toFixed(1)}`;
      const steps=30;
      for(let s=1;s<=steps;s++){
        const x=w*s/steps;
        const t=s/steps*Math.PI*2*(.7+state.frequency/34)+state.phase*Math.PI/180+i*.55;
        const y=y0+Math.sin(t)*(amp*(.35+state.frequency/90))+Math.cos(t*.53+i)*amp*.28;
        d+=` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      d+=` L ${w} ${h} L 0 ${h} Z`;
      out+=`<path d="${d}" fill="${colors[i%colors.length]}" fill-opacity="${(.20+.055*(i%4)).toFixed(2)}"/>`;
    }
    for(let i=0;i<Math.round(state.density*.7);i++){
      const cx=rnd()*w,cy=rnd()*h,r=scaledR(Math.min(w,h)*(.03+.06*rnd()));
      out+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${colors[i%colors.length]}" fill-opacity=".13"/>`;
    }
    return out;
  }

  function modeShapesWatercolor(w,h,colors,rnd){
    let out=`<defs>${paperTexture("shapesPaper")}</defs><g filter="url(#shapesPaper)">`;
    const n=state.density+2;
    for(let i=0;i<n;i++){
      const cx=rnd()*w,cy=rnd()*h,size=scaledR(Math.min(w,h)*(.07+.12*rnd()));
      const c=colors[i%colors.length];
      const type=i%3;
      if(type===0){
        out+=makeBlob(cx,cy,size,c,.58,state.strokeColor,state.thickness,Math.floor(rnd()*1e9));
      }else if(type===1){
        const rot=Math.floor(rnd()*360);
        out+=`<rect x="${(cx-size).toFixed(1)}" y="${(cy-size*.7).toFixed(1)}" width="${(size*2).toFixed(1)}" height="${(size*1.4).toFixed(1)}"
          rx="${(size*.18).toFixed(1)}" transform="rotate(${rot} ${cx.toFixed(1)} ${cy.toFixed(1)})"
          fill="${c}" fill-opacity=".53" stroke="${state.strokeColor}" stroke-opacity="${aClamp(state.strokeOpacity*.7)}" stroke-width="${state.thickness}"/>`;
      }else{
        out+=`<polygon points="${cx.toFixed(1)},${(cy-size).toFixed(1)} ${(cx+size).toFixed(1)},${(cy+size*.72).toFixed(1)} ${(cx-size).toFixed(1)},${(cy+size*.72).toFixed(1)}"
          fill="${c}" fill-opacity=".5" stroke="${state.strokeColor}" stroke-opacity="${aClamp(state.strokeOpacity*.7)}" stroke-width="${state.thickness}"/>`;
      }
    }
    return out+"</g>";
  }

  function modeOrganicShapesWatercolor(w,h,colors,rnd){
    let out="";
    for(let i=0;i<state.density+3;i++){
      const cx=rnd()*w,cy=rnd()*h,r=scaledR(Math.min(w,h)*(.06+.13*rnd()));
      const c=colors[i%colors.length];
      out+=makeBlob(cx,cy,r,c,.52,state.strokeColor,state.thickness,Math.floor(rnd()*1e9));
      out+=makeBlob(cx+(rnd()-.5)*r*.22,cy+(rnd()-.5)*r*.22,r*.82,c,.20,"",0,Math.floor(rnd()*1e9));
    }
    return out;
  }

  function modeCirclesWatercolor(w,h,colors,rnd){
    let out=`<defs>`;
    for(let i=0;i<colors.length;i++) out+=watercolorGradient(`circleG${i}`,colors[i],rnd,.96);
    out+=`</defs>`;
    for(let i=0;i<state.density+5;i++){
      const cx=rnd()*w,cy=rnd()*h,r=scaledR(Math.min(w,h)*(.035+.08*rnd()));
      const gid=`circleG${i%colors.length}`;
      out+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="url(#${gid})"/>`;
      out+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r*1.04).toFixed(1)}" fill="none"
        stroke="${state.strokeColor}" stroke-opacity="${aClamp(state.strokeOpacity*.35)}" stroke-width="${Math.max(1,state.thickness*.65)}"/>`;
    }
    return out;
  }

  function modeSplashesWatercolor(w,h,colors,rnd){
    let out="";
    const splashes=Math.max(4,Math.round(state.density*.65));
    for(let i=0;i<splashes;i++){
      const cx=rnd()*w,cy=rnd()*h,mainR=scaledR(Math.min(w,h)*(.025+.065*rnd())),c=colors[i%colors.length];
      out+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${mainR.toFixed(1)}" fill="${c}" fill-opacity=".64"/>`;
      const dots=5+Math.floor(state.chaos/8);
      for(let j=0;j<dots;j++){
        const a=rnd()*Math.PI*2,dist=mainR*(1.5+4*rnd()),rr=Math.max(2,mainR*(.08+.20*rnd()));
        out+=`<circle cx="${(cx+Math.cos(a)*dist).toFixed(1)}" cy="${(cy+Math.sin(a)*dist).toFixed(1)}" r="${rr.toFixed(1)}" fill="${c}" fill-opacity="${(.28+.4*rnd()).toFixed(2)}"/>`;
      }
    }
    return out;
  }

  function modeWashesWatercolor(w,h,colors,rnd){
    let out="";
    const washes=4+Math.floor(state.density/3);
    for(let i=0;i<washes;i++){
      const c=colors[i%colors.length];
      const y=(i/(washes-1))*h + (rnd()-.5)*h*.15;
      const rx=w*(.30+.28*rnd()), ry=scaledR(Math.min(w,h)*(.10+.08*rnd()));
      out+=irregularEllipse(rnd()*w,y,rx,ry,c,.10+.08*rnd(),rnd,Math.floor(rnd()*1e9));
    }
    return out;
  }

  function modeMarblingWatercolor(w,h,colors,rnd){
    let out="";
    const paths=state.density+8;
    for(let i=0;i<paths;i++){
      const y=(i/(paths-1))*h;
      let d=`M 0 ${(y+(rnd()-.5)*h*.18).toFixed(1)}`;
      for(let s=1;s<=36;s++){
        const x=w*s/36, t=s/36*Math.PI*2*(.9+state.frequency/30)+i*.21+state.phase*Math.PI/180;
        const yy=y+Math.sin(t)*scaledR(Math.min(w,h)*(.025+state.amplitude/4200))+Math.sin(t*2.3+i)*scaledR(Math.min(w,h)*.018);
        d+=` C ${(x-w/36).toFixed(1)} ${yy.toFixed(1)}, ${x.toFixed(1)} ${(yy+Math.sin(t+.9)*12).toFixed(1)}, ${x.toFixed(1)} ${yy.toFixed(1)}`;
      }
      out+=`<path d="${d}" fill="none" stroke="${colors[i%colors.length]}" stroke-opacity=".42" stroke-width="${Math.max(2,state.thickness*2.4)}"/>`;
    }
    return out;
  }

  function modeSwirlsWatercolor(w,h,colors,rnd){
    let out="";
    const count=Math.max(3,Math.round(state.density*.45));
    for(let i=0;i<count;i++){
      const cx=rnd()*w,cy=rnd()*h,maxR=scaledR(Math.min(w,h)*(.10+.18*rnd()));
      const turns=3+Math.floor(state.frequency/25);
      let d="";
      const steps=80;
      for(let s=0;s<=steps;s++){
        const t=s/steps*Math.PI*2*turns;
        const r=maxR*(1-s/steps);
        const x=cx+Math.cos(t+state.phase*Math.PI/180)*r;
        const y=cy+Math.sin(t+state.phase*Math.PI/180)*r;
        d+=`${s===0?"M":"L"} ${x.toFixed(1)} ${y.toFixed(1)} `;
      }
      out+=`<path d="${d}" fill="none" stroke="${colors[i%colors.length]}" stroke-opacity=".48" stroke-width="${Math.max(2,state.thickness*1.35)}" stroke-linecap="round"/>`;
    }
    return out;
  }

  function modeWavesWatercolor(w,h,colors,rnd){
    let out="";
    const layers=Math.max(4,Math.round(state.density*.72));
    for(let i=0;i<layers;i++){
      const y0=(i/(layers-1))*h;
      let d=`M 0 ${y0.toFixed(1)}`;
      for(let x=0;x<=w;x+=Math.max(24,w/36)){
        const t=x/w*Math.PI*2*(.7+state.frequency/28)+i*.38+state.phase*Math.PI/180;
        const y=y0+Math.sin(t)*scaledR(Math.min(w,h)*(.025+state.amplitude/4200));
        d+=` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      out+=`<path d="${d}" fill="none" stroke="${colors[i%colors.length]}" stroke-opacity=".46" stroke-width="${Math.max(2,state.thickness*1.7)}" stroke-linecap="round"/>`;
    }
    return out;
  }

  function modeDotsWatercolor(w,h,colors,rnd){
    let out="";
    const count=state.density*4;
    for(let i=0;i<count;i++){
      const x=rnd()*w,y=rnd()*h,r=scaledR(Math.min(w,h)*(.008+.026*rnd()));
      out+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${colors[i%colors.length]}" fill-opacity="${(.22+.58*rnd()).toFixed(2)}"/>`;
      if(state.chaos>35 && rnd()>.72){
        out+=`<circle cx="${(x+rnd()*r*2).toFixed(1)}" cy="${(y+rnd()*r*2).toFixed(1)}" r="${(r*.35).toFixed(1)}" fill="${colors[(i+1)%colors.length]}" fill-opacity=".18"/>`;
      }
    }
    return out;
  }

  function modeConfettiWatercolor(w,h,colors,rnd){
    let out="";
    const count=state.density*3;
    for(let i=0;i<count;i++){
      const x=rnd()*w,y=rnd()*h,s=scaledR(Math.min(w,h)*(.008+.025*rnd()));
      const rot=rnd()*360,c=colors[i%colors.length];
      if(i%2){
        out+=`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(s*1.8).toFixed(1)}" ry="${(s*.55).toFixed(1)}" transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${c}" fill-opacity=".48"/>`;
      }else{
        out+=`<rect x="${(x-s).toFixed(1)}" y="${(y-s*.55).toFixed(1)}" width="${(s*2).toFixed(1)}" height="${s.toFixed(1)}" transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" rx="${(s*.25).toFixed(1)}" fill="${c}" fill-opacity=".48"/>`;
      }
    }
    return out;
  }

  function modeGalaxyWatercolor(w,h,colors,rnd){
    let out="";
    const count=state.density+2;
    for(let i=0;i<count;i++){
      const cx=rnd()*w,cy=rnd()*h,r=scaledR(Math.min(w,h)*(.07+.15*rnd()));
      const gid=`gal${i}`;
      out+=`<defs>${watercolorGradient(gid,colors[i%colors.length],rnd,.95)}</defs>`;
      out+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="url(#${gid})"/>`;
    }
    const stars=state.density*6;
    for(let i=0;i<stars;i++){
      const x=rnd()*w,y=rnd()*h,r=scaledR(Math.min(w,h)*(.002+.006*rnd()));
      out+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${state.strokeColor}" fill-opacity="${(.20+.7*rnd()).toFixed(2)}"/>`;
    }
    return out;
  }

  function modeBotanicalWatercolor(w,h,colors,rnd){
    let out="";
    const groups=Math.max(2,Math.round(state.density*.38));
    for(let g=0;g<groups;g++){
      const x0=rnd()*w,y0=rnd()*h,dir=rnd()*Math.PI*2;
      const len=scaledR(Math.min(w,h)*(.16+.18*rnd()));
      let d=`M ${x0.toFixed(1)} ${y0.toFixed(1)}`;
      for(let s=1;s<=18;s++){
        const t=s/18;
        const x=x0+Math.cos(dir)*len*t;
        const y=y0+Math.sin(dir)*len*t;
        d+=` L ${x.toFixed(1)} ${y.toFixed(1)}`;
        const leafR=scaledR(Math.min(w,h)*(.015+.025*rnd()));
        const side=(s%2===0?1:-1);
        const lx=x+Math.cos(dir+side*.9)*leafR*2;
        const ly=y+Math.sin(dir+side*.9)*leafR*2;
        out+=`<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="${(leafR*1.5).toFixed(1)}" ry="${leafR.toFixed(1)}"
          transform="rotate(${(dir*180/Math.PI+side*35).toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})"
          fill="${colors[g%colors.length]}" fill-opacity=".36"/>`;
      }
      out+=`<path d="${d}" fill="none" stroke="${colors[(g+1)%colors.length]}" stroke-opacity=".42" stroke-width="${Math.max(2,state.thickness*1.35)}" stroke-linecap="round"/>`;
    }
    return out;
  }

  function modeAbstractShapes(w,h,colors,rnd){
    let out="";
    for(let i=0;i<state.density+3;i++){
      const x=rnd()*w,y=rnd()*h,s=scaledR(Math.min(w,h)*(.06+.12*rnd())),c=colors[i%colors.length];
      const type=i%4;
      if(type===0){
        out+=makeBlob(x,y,s,c,.54,state.strokeColor,state.thickness,Math.floor(rnd()*1e9));
      }else if(type===1){
        out+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s.toFixed(1)}" fill="${c}" fill-opacity=".48"/>`;
      }else if(type===2){
        const points=`${x},${y-s} ${x+s*.86},${y+s*.65} ${x-s*.86},${y+s*.65}`;
        out+=`<polygon points="${points}" fill="${c}" fill-opacity=".5"/>`;
      }else{
        out+=`<path d="M ${x-s} ${y} Q ${x} ${y-s*1.7} ${x+s} ${y} Q ${x} ${y+s*1.7} ${x-s} ${y} Z"
          fill="${c}" fill-opacity=".43"/>`;
      }
    }
    return out;
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
      const cx=rnd()*w, cy=rnd()*h, r=scaledR(Math.min(w,h)*(.06+rnd()*.16));
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

  function makeSvg(index){
    const {w,h}=dims();
    const baseSeed=Number(state.seed)||1;
    const rnd=mulberry32(baseSeed + index*10091);
    const palette = palettes[(Math.floor(baseSeed/7)+index)%palettes.length];
    const bg = state.bgColor || palette[0];
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
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <title>ALI STUDIO SVG Poster ${String(index+1).padStart(2,"0")}</title>
  <metadata>Generated locally by ALI STUDIO SVG Design Lab. Seed ${esc(state.seed)}.</metadata>
  ${addBackground(w,h,bg)}
  ${shapes}
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
      shapeSize:["shapeSizeVal",v=>v+"%"],
      thickness:["thicknessVal",v=>v+"PX"],
      amplitude:["amplitudeVal",v=>v+"%"],
      phase:["phaseVal",v=>v+"°"],
      strokeOpacity:["strokeOpacityVal",v=>v+"%"]
    };
    for(const [id,[out,fmt]] of Object.entries(map)) $(out).textContent=fmt($(id).value);
  }

  function readControls(){
    for(const key of ["posterCount","designMode","density","frequency","shapeSize","thickness","amplitude","phase","chaos","format","quality","bgColor","strokeColor","strokeOpacity"]){
      const el=$(key);
      state[key]=el.type==="range"||el.tagName==="SELECT" ? (el.id==="posterCount"||["density","frequency","thickness","amplitude","phase","chaos","strokeOpacity"].includes(key)?Number(el.value):el.value) : el.value;
    }
    state.seed=Number($("seed").value)||1;
  }

  function bind(){
    ["posterCount","designMode","density","frequency","shapeSize","thickness","amplitude","phase","chaos","seed","format","quality","bgColor","strokeColor","strokeOpacity"].forEach(id=>{
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
      generated.forEach((svg,i)=>setTimeout(()=>download(`ali-studio-poster-${String(i+1).padStart(2,"0")}.svg`,svg),i*120));
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
