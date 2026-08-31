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
    blurAmount: 24,
    layoutChaos: 45,
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

  let state = { ...defaults };
  let zoom = 1;
  let generated = [];

  const palettes = [
    ["#3b0065", "#ffeb0b", "#8cff16", "#d96b12"],
    ["#1437c9", "#13326a", "#194ee4", "#25a1dd"],
    ["#ec5b1c", "#c52448", "#0b6a40", "#e74821"],
    ["#a3d80c", "#55dc13", "#7ecb0a", "#a52708"],
    ["#101f55", "#7c48e2", "#ef3d91", "#17b7e5"],
    ["#f45b0c", "#ffb31a", "#087c65", "#ec3779"]
  ];

  const modernPalettes = [
    ["#f1ede7", "#ff6324", "#6753dc", "#11152c"],
    ["#e9e5df", "#f45120", "#5144bd", "#171a2e"],
    ["#f3eee7", "#ee4520", "#7458e5", "#0d1221"],
    ["#ece9e2", "#ff7624", "#5149d0", "#11152a"],
    ["#f6f0e9", "#ef4a1c", "#6256e6", "#101321"]
  ];

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const aClamp = (v) => clamp(Number(v) / 100, 0, 1);
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
  }[c]));

  function mulberry32(a) {
    return function () {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function shapeFactor() {
    return clamp(Number(state.shapeSize || 100) / 100, 0.2, 1.6);
  }

  function scaledR(v) {
    return v * shapeFactor();
  }

  function dims() {
    const map = {
      portrait: { w: 1200, h: 1800 },
      square: { w: 1600, h: 1600 },
      landscape: { w: 1800, h: 1200 }
    };
    const quality = { standard: 1, large: 1.35, xl: 1.8 }[state.quality] || 1;
    const d = map[state.format] || map.portrait;
    return { w: Math.round(d.w * quality), h: Math.round(d.h * quality) };
  }

  function makeBlob(cx, cy, r, fill, opacity, stroke = "", sw = 0, seed = 1) {
    const rnd = mulberry32(seed);
    const points = clamp(Math.round(12 + state.chaos / 8), 12, 28);
    const amp = r * (0.05 + state.chaos / 1200);
    const pts = [];
    for (let i = 0; i < points; i++) {
      const a = Math.PI * 2 * i / points;
      const rr = r + (rnd() - 0.5) * amp;
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)} `;
    for (let i = 1; i < pts.length; i++) d += `L ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} `;
    d += "Z";
    return `<path d="${d}" fill="${fill}" fill-opacity="${opacity}"${stroke ? ` stroke="${stroke}" stroke-opacity="${aClamp(state.strokeOpacity)}" stroke-width="${sw}"` : ""}/>`;
  }

  function irregularEllipse(cx, cy, rx, ry, fill, opacity, seed) {
    const pts = 18 + Math.round(state.chaos / 7);
    const rnd = mulberry32(seed);
    let d = "";
    for (let i = 0; i < pts; i++) {
      const a = Math.PI * 2 * i / pts;
      const jitter = 1 + (rnd() - 0.5) * (0.08 + state.chaos / 500);
      const x = cx + Math.cos(a) * rx * jitter;
      const y = cy + Math.sin(a) * ry * jitter;
      d += `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    d += "Z";
    return `<path d="${d}" fill="${fill}" fill-opacity="${opacity}"/>`;
  }

  function watercolorGradient(id, color, rnd, strength = 1) {
    return `<radialGradient id="${id}" cx="${18 + rnd() * 50}%" cy="${15 + rnd() * 40}%" r="88%">
      <stop offset="0%" stop-color="${color}" stop-opacity="${0.95 * strength}"/>
      <stop offset="52%" stop-color="${color}" stop-opacity="${0.62 * strength}"/>
      <stop offset="82%" stop-color="${color}" stop-opacity="${0.25 * strength}"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </radialGradient>`;
  }

  function addBackground(w, h, bg, colors, seed) {
    if (state.designMode === "modernGradientEditorial") {
      return `<rect width="${w}" height="${h}" fill="#f1ede7"/>`;
    }
    const rnd = mulberry32(seed + 17);
    const id = `bg_${Math.abs(seed)}_${w}_${h}`;
    const c1 = bg || colors[0];
    const c2 = colors[Math.floor(rnd() * colors.length)];
    const c3 = colors[Math.floor(rnd() * colors.length)];
    const c4 = colors[Math.floor(rnd() * colors.length)];
    const angle = Math.round(95 + rnd() * 75);
    return `<defs>
      <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(${angle / .9})">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="34%" stop-color="${c2}"/>
        <stop offset="67%" stop-color="${c3}"/>
        <stop offset="100%" stop-color="${c4}"/>
      </linearGradient>
      <radialGradient id="${id}_g1" cx="24%" cy="20%" r="70%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity=".14"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${id}_g2" cx="76%" cy="72%" r="65%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity=".10"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#${id})"/>
    <rect width="${w}" height="${h}" fill="url(#${id}_g1)"/>
    <rect width="${w}" height="${h}" fill="url(#${id}_g2)"/>`;
  }

  function modeRetroBubble(w, h, colors, rnd) {
    const out = [];
    const count = state.density;
    const baseR = Math.min(w, h) * (0.11 + state.amplitude / 1800) * shapeFactor();
    for (let i = 0; i < count; i++) {
      const edge = i % 3 === 0;
      const cx = edge ? rnd() * w * 1.25 - w * .12 : rnd() * w;
      const cy = edge ? rnd() * h * 1.20 - h * .10 : rnd() * h;
      const r = baseR * (0.55 + rnd() * 1.2);
      const fill = colors[i % colors.length];
      out.push(makeBlob(cx, cy, r, fill, .88, "", 0, Math.floor(rnd() * 1e9)));
      if (state.thickness > 0) {
        const rings = 1 + Math.floor(state.frequency / 35);
        for (let k = 1; k <= rings; k++) {
          out.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r * (1 + k * .08)).toFixed(1)}" fill="none" stroke="${state.strokeColor}" stroke-opacity="${aClamp(state.strokeOpacity)}" stroke-width="${state.thickness}"/>`);
        }
      }
    }
    return out.join("");
  }

  function modeWatercolor(w, h, colors, rnd) {
    let out = "<defs>";
    for (let i = 0; i < colors.length; i++) out += watercolorGradient(`wc${i}`, colors[i], rnd);
    out += "</defs>";
    for (let i = 0; i < state.density + 3; i++) {
      const cx = rnd() * w, cy = rnd() * h;
      const r = scaledR(Math.min(w, h) * (.075 + rnd() * .15));
      out += makeBlob(cx, cy, r, `url(#wc${i % colors.length})`, 1, state.strokeColor, state.thickness, Math.floor(rnd() * 1e9));
      for (let j = 1; j < 3 + Math.floor(state.frequency / 30); j++) {
        out += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r * (1 + j * .06)).toFixed(1)}" fill="none" stroke="${state.strokeColor}" stroke-opacity="${aClamp(state.strokeOpacity * .35)}" stroke-width="${Math.max(1, state.thickness * .65)}"/>`;
      }
    }
    return out;
  }

  function modeWatercolorBlobs(w, h, colors, rnd) {
    let out = "";
    for (let i = 0; i < state.density + 2; i++) {
      const cx = rnd() * w, cy = rnd() * h;
      const rx = scaledR(Math.min(w, h) * (.06 + rnd() * .12));
      const ry = rx * (.6 + rnd() * .9);
      out += irregularEllipse(cx, cy, rx, ry, colors[i % colors.length], .65 + rnd() * .18, Math.floor(rnd() * 1e9));
    }
    return out;
  }

  function modeWatercolorFluid(w, h, colors, rnd) {
    let out = "";
    const bands = Math.max(4, Math.round(state.density * .65));
    const amp = scaledR(Math.min(w, h) * (.045 + state.amplitude / 3100));
    for (let i = 0; i < bands; i++) {
      const y0 = i / (bands - 1) * h;
      let d = `M 0 ${y0.toFixed(1)}`;
      for (let x = 0; x <= w; x += Math.max(24, w / 30)) {
        const t = x / w * Math.PI * 2 * (.7 + state.frequency / 35) + i * .55 + state.phase * Math.PI / 180;
        const y = y0 + Math.sin(t) * amp * (.45 + state.frequency / 90) + Math.cos(t * .55 + i) * amp * .18;
        d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      d += ` L ${w} ${h} L 0 ${h} Z`;
      out += `<path d="${d}" fill="${colors[i % colors.length]}" fill-opacity="${(.15 + .055 * (i % 5)).toFixed(2)}"/>`;
    }
    return out;
  }

  function modeShapesWatercolor(w, h, colors, rnd) {
    let out = "";
    for (let i = 0; i < state.density + 2; i++) {
      const cx = rnd() * w, cy = rnd() * h, size = scaledR(Math.min(w, h) * (.07 + .12 * rnd()));
      if (i % 3 === 0) out += makeBlob(cx, cy, size, colors[i % colors.length], .55, state.strokeColor, state.thickness, Math.floor(rnd() * 1e9));
      else if (i % 3 === 1) out += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${size.toFixed(1)}" fill="${colors[i % colors.length]}" fill-opacity=".42"/>`;
      else out += `<rect x="${(cx-size).toFixed(1)}" y="${(cy-size*.65).toFixed(1)}" width="${(size*2).toFixed(1)}" height="${(size*1.3).toFixed(1)}" rx="${(size*.2).toFixed(1)}" transform="rotate(${(rnd()*360).toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})" fill="${colors[i % colors.length]}" fill-opacity=".42"/>`;
    }
    return out;
  }

  function modeOrganicShapesWatercolor(w, h, colors, rnd) {
    let out = "";
    for (let i = 0; i < state.density + 3; i++) {
      const cx = rnd() * w, cy = rnd() * h, r = scaledR(Math.min(w, h) * (.055 + rnd() * .13));
      out += makeBlob(cx, cy, r, colors[i % colors.length], .52, state.strokeColor, state.thickness, Math.floor(rnd() * 1e9));
      out += makeBlob(cx + (rnd() - .5) * r * .25, cy + (rnd() - .5) * r * .25, r * .78, colors[i % colors.length], .18, "", 0, Math.floor(rnd() * 1e9));
    }
    return out;
  }

  function modeCirclesWatercolor(w, h, colors, rnd) {
    let out = "<defs>";
    for (let i = 0; i < colors.length; i++) out += watercolorGradient(`cg${i}`, colors[i], rnd, .95);
    out += "</defs>";
    for (let i = 0; i < state.density + 5; i++) {
      const x = rnd() * w, y = rnd() * h, r = scaledR(Math.min(w, h) * (.035 + .075 * rnd()));
      out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="url(#cg${i % colors.length})"/>`;
    }
    return out;
  }

  function modeSplashesWatercolor(w, h, colors, rnd) {
    let out = "";
    for (let i = 0; i < Math.max(4, Math.round(state.density * .7)); i++) {
      const cx = rnd() * w, cy = rnd() * h, r = scaledR(Math.min(w, h) * (.022 + .055 * rnd())), c = colors[i % colors.length];
      out += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${c}" fill-opacity=".62"/>`;
      for (let j = 0; j < 7 + Math.floor(state.chaos / 12); j++) {
        const a = rnd() * Math.PI * 2, d = r * (1.5 + rnd() * 4), rr = Math.max(2, r * (.08 + rnd() * .2));
        out += `<circle cx="${(cx+Math.cos(a)*d).toFixed(1)}" cy="${(cy+Math.sin(a)*d).toFixed(1)}" r="${rr.toFixed(1)}" fill="${c}" fill-opacity="${(.25 + rnd() * .35).toFixed(2)}"/>`;
      }
    }
    return out;
  }

  function modeWashesWatercolor(w, h, colors, rnd) {
    let out = "";
    const washes = 4 + Math.floor(state.density / 3);
    for (let i = 0; i < washes; i++) {
      out += irregularEllipse(rnd() * w, i / (washes - 1) * h + (rnd() - .5) * h * .12, w * (.28 + .25 * rnd()), scaledR(Math.min(w,h) * (.08 + .07 * rnd())), colors[i % colors.length], .12 + .08 * rnd(), Math.floor(rnd() * 1e9));
    }
    return out;
  }

  function modeMarblingWatercolor(w, h, colors, rnd) {
    let out = "";
    const paths = state.density + 8;
    for (let i = 0; i < paths; i++) {
      const y = i / (paths - 1) * h;
      let d = `M 0 ${y.toFixed(1)}`;
      for (let x = 0; x <= w; x += Math.max(20, w / 36)) {
        const t = x / w * Math.PI * 2 * (.8 + state.frequency / 35) + i * .23;
        const yy = y + Math.sin(t) * scaledR(Math.min(w,h) * (.025 + state.amplitude / 4600)) + Math.sin(t * 2.4 + i) * scaledR(Math.min(w,h) * .012);
        d += ` L ${x.toFixed(1)} ${yy.toFixed(1)}`;
      }
      out += `<path d="${d}" fill="none" stroke="${colors[i % colors.length]}" stroke-opacity=".42" stroke-width="${Math.max(2, state.thickness*2.2)}"/>`;
    }
    return out;
  }

  function modeSwirlsWatercolor(w, h, colors, rnd) {
    let out = "";
    const count = Math.max(3, Math.round(state.density * .45));
    for (let i = 0; i < count; i++) {
      const cx = rnd() * w, cy = rnd() * h, maxR = scaledR(Math.min(w,h) * (.1 + .18 * rnd()));
      const turns = 3 + Math.floor(state.frequency / 25), steps = 90;
      let d = "";
      for (let s = 0; s <= steps; s++) {
        const t = s / steps * Math.PI * 2 * turns, r = maxR * (1 - s/steps);
        const x = cx + Math.cos(t + state.phase * Math.PI/180) * r;
        const y = cy + Math.sin(t + state.phase * Math.PI/180) * r;
        d += `${s===0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)} `;
      }
      out += `<path d="${d}" fill="none" stroke="${colors[i % colors.length]}" stroke-opacity=".48" stroke-width="${Math.max(2,state.thickness*1.35)}" stroke-linecap="round"/>`;
    }
    return out;
  }

  function modeWavesWatercolor(w, h, colors, rnd) {
    let out = "";
    const layers = Math.max(4, Math.round(state.density * .72));
    for (let i = 0; i < layers; i++) {
      const y0 = i / (layers - 1) * h;
      let d = `M 0 ${y0.toFixed(1)}`;
      for (let x=0; x<=w; x+=Math.max(24,w/34)) {
        const t = x/w*Math.PI*2*(.7+state.frequency/30)+i*.38;
        const y = y0 + Math.sin(t) * scaledR(Math.min(w,h)*(.025+state.amplitude/4500));
        d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      out += `<path d="${d}" fill="none" stroke="${colors[i % colors.length]}" stroke-opacity=".42" stroke-width="${Math.max(2,state.thickness*1.6)}" stroke-linecap="round"/>`;
    }
    return out;
  }

  function modeDotsWatercolor(w, h, colors, rnd) {
    let out="";
    for(let i=0;i<state.density*4;i++){
      const x=rnd()*w,y=rnd()*h,r=scaledR(Math.min(w,h)*(.008+.026*rnd()));
      out+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${colors[i%colors.length]}" fill-opacity="${(.25+.55*rnd()).toFixed(2)}"/>`;
    }
    return out;
  }

  function modeConfettiWatercolor(w, h, colors, rnd) {
    let out="";
    for(let i=0;i<state.density*3;i++){
      const x=rnd()*w,y=rnd()*h,s=scaledR(Math.min(w,h)*(.008+.025*rnd())),rot=rnd()*360,c=colors[i%colors.length];
      out+=`<rect x="${(x-s).toFixed(1)}" y="${(y-s*.5).toFixed(1)}" width="${(s*2).toFixed(1)}" height="${s.toFixed(1)}" rx="${(s*.2).toFixed(1)}" transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${c}" fill-opacity=".48"/>`;
    }
    return out;
  }

  function modeGalaxyWatercolor(w, h, colors, rnd) {
    let out="<defs>";
    for(let i=0;i<colors.length;i++) out+=watercolorGradient(`gg${i}`,colors[i],rnd,.95);
    out+="</defs>";
    for(let i=0;i<state.density+2;i++){
      const x=rnd()*w,y=rnd()*h,r=scaledR(Math.min(w,h)*(.07+.15*rnd()));
      out+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="url(#gg${i%colors.length})"/>`;
    }
    for(let i=0;i<state.density*6;i++){
      const x=rnd()*w,y=rnd()*h,r=scaledR(Math.min(w,h)*(.002+.006*rnd()));
      out+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${state.strokeColor}" fill-opacity="${(.2+.7*rnd()).toFixed(2)}"/>`;
    }
    return out;
  }

  function modeBotanicalWatercolor(w,h,colors,rnd){
    let out="";
    for(let g=0;g<Math.max(2,Math.round(state.density*.38));g++){
      const x0=rnd()*w,y0=rnd()*h,dir=rnd()*Math.PI*2,len=scaledR(Math.min(w,h)*(.16+.18*rnd()));
      let d=`M ${x0.toFixed(1)} ${y0.toFixed(1)}`;
      for(let s=1;s<=18;s++){
        const t=s/18,x=x0+Math.cos(dir)*len*t,y=y0+Math.sin(dir)*len*t;
        d+=` L ${x.toFixed(1)} ${y.toFixed(1)}`;
        const lr=scaledR(Math.min(w,h)*(.012+.025*rnd())),side=s%2?1:-1,lx=x+Math.cos(dir+side*.9)*lr*2,ly=y+Math.sin(dir+side*.9)*lr*2;
        out+=`<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="${(lr*1.6).toFixed(1)}" ry="${lr.toFixed(1)}" transform="rotate(${(dir*180/Math.PI+side*35).toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})" fill="${colors[g%colors.length]}" fill-opacity=".36"/>`;
      }
      out+=`<path d="${d}" fill="none" stroke="${colors[(g+1)%colors.length]}" stroke-opacity=".42" stroke-width="${Math.max(2,state.thickness*1.3)}"/>`;
    }
    return out;
  }

  function modeAbstractShapes(w,h,colors,rnd){
    let out="";
    for(let i=0;i<state.density+3;i++){
      const x=rnd()*w,y=rnd()*h,s=scaledR(Math.min(w,h)*(.06+.12*rnd())),c=colors[i%colors.length];
      if(i%4===0) out+=makeBlob(x,y,s,c,.55,state.strokeColor,state.thickness,Math.floor(rnd()*1e9));
      else if(i%4===1) out+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s.toFixed(1)}" fill="${c}" fill-opacity=".48"/>`;
      else if(i%4===2) out+=`<polygon points="${x.toFixed(1)},${(y-s).toFixed(1)} ${(x+s*.86).toFixed(1)},${(y+s*.65).toFixed(1)} ${(x-s*.86).toFixed(1)},${(y+s*.65).toFixed(1)}" fill="${c}" fill-opacity=".5"/>`;
      else out+=`<path d="M ${(x-s).toFixed(1)} ${y.toFixed(1)} Q ${x.toFixed(1)} ${(y-s*1.7).toFixed(1)} ${(x+s).toFixed(1)} ${y.toFixed(1)} Q ${x.toFixed(1)} ${(y+s*1.7).toFixed(1)} ${(x-s).toFixed(1)} ${y.toFixed(1)} Z" fill="${c}" fill-opacity=".43"/>`;
    }
    return out;
  }

  function modeModernGradientEditorial(w,h,colors,rnd,index){
    const out=[];
    const minDim=Math.min(w,h);
    const blur=Number(state.blurAmount||24);
    const variation=Number(state.layoutChaos||45)/100;
    const sf=shapeFactor();
    const uid=`modern_${Math.abs((Number(state.seed)||1)+index*7013)}_${w}_${h}`;
    const bg="#f1ede7";
    const hot=colors[1], violet=colors[2], dark=colors[3];

    out.push(`<defs>
      <filter id="${uid}_blur" x="-55%" y="-55%" width="210%" height="210%"><feGaussianBlur stdDeviation="${blur}"/></filter>
      <filter id="${uid}_soft" x="-35%" y="-35%" width="170%" height="170%"><feGaussianBlur stdDeviation="${Math.max(5,blur*.45)}"/></filter>
      <linearGradient id="${uid}_orange" x1="10%" y1="10%" x2="90%" y2="90%"><stop offset="0%" stop-color="${hot}"/><stop offset="58%" stop-color="${hot}" stop-opacity=".58"/><stop offset="100%" stop-color="${hot}" stop-opacity="0"/></linearGradient>
      <linearGradient id="${uid}_violet" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="${violet}" stop-opacity=".86"/><stop offset="65%" stop-color="${violet}" stop-opacity=".42"/><stop offset="100%" stop-color="${violet}" stop-opacity="0"/></linearGradient>
      <radialGradient id="${uid}_dark" cx="42%" cy="44%" r="63%"><stop offset="0%" stop-color="#050714"/><stop offset="72%" stop-color="${dark}" stop-opacity=".96"/><stop offset="100%" stop-color="${dark}" stop-opacity="0"/></radialGradient>
    </defs>`);

    out.push(`<rect width="${w}" height="${h}" fill="${bg}"/>`);

    // Soft, modern background glows.
    const glowR=minDim*(.14+.05*variation)*sf;
    out.push(`<circle cx="${(w*.16).toFixed(1)}" cy="${(h*.14).toFixed(1)}" r="${glowR.toFixed(1)}" fill="${hot}" fill-opacity=".36" filter="url(#${uid}_blur)"/>`);
    out.push(`<circle cx="${(w*.80).toFixed(1)}" cy="${(h*.70).toFixed(1)}" r="${(glowR*1.15).toFixed(1)}" fill="${violet}" fill-opacity=".25" filter="url(#${uid}_blur)"/>`);

    // Orange edge orb.
    const ox = rnd() > .5 ? -w*.025 : w*1.02;
    const oy = h*(.13+rnd()*.10);
    const or = minDim*(.17+.07*rnd())*sf;
    out.push(`<circle cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" r="${or.toFixed(1)}" fill="url(#${uid}_orange)" filter="url(#${uid}_soft)"/>`);

    // Pale architectural panel.
    const px=w*(.48+(rnd()-.5)*.12*variation), py=h*(.28+(rnd()-.5)*.08), pw=w*(.39+rnd()*.14), ph=h*(.16+rnd()*.07);
    out.push(`<rect x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${pw.toFixed(1)}" height="${ph.toFixed(1)}" rx="${(minDim*.02).toFixed(1)}" fill="#ffffff" fill-opacity=".18"/>`);

    // Main dark sphere.
    const sx=w*(.38+(rnd()-.5)*.12*variation), sy=h*(.54+(rnd()-.5)*.12*variation), sr=minDim*(.16+.055*rnd())*sf;
    out.push(`<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${(sr*1.35).toFixed(1)}" fill="${dark}" fill-opacity=".13" filter="url(#${uid}_blur)"/>`);
    out.push(`<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${sr.toFixed(1)}" fill="url(#${uid}_dark)"/>`);

    // Purple overlap sphere.
    const qx=sx+minDim*(.095+.045*rnd()), qy=sy+minDim*(.085+.055*rnd()), qr=sr*(.60+.10*rnd());
    out.push(`<circle cx="${qx.toFixed(1)}" cy="${qy.toFixed(1)}" r="${(qr*1.14).toFixed(1)}" fill="${violet}" fill-opacity=".14" filter="url(#${uid}_blur)"/>`);
    out.push(`<circle cx="${qx.toFixed(1)}" cy="${qy.toFixed(1)}" r="${qr.toFixed(1)}" fill="url(#${uid}_violet)"/>`);

    // Lower right orange arc/circle.
    const bx=w*(.88+(rnd()-.5)*.08*variation), by=h*(.86+(rnd()-.5)*.08*variation), br=minDim*(.13+.045*rnd())*sf;
    out.push(`<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${(br*1.2).toFixed(1)}" fill="${hot}" fill-opacity=".16" filter="url(#${uid}_blur)"/>`);
    out.push(`<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${br.toFixed(1)}" fill="url(#${uid}_orange)"/>`);

    // Construction line and concentric rings.
    const x1=w*(.83+rnd()*.08), y1=h*(.08+rnd()*.12), x2=w*(.23+rnd()*.13), y2=h*(.84+rnd()*.08);
    out.push(`<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${dark}" stroke-opacity=".43" stroke-width="${Math.max(.7,state.thickness*.45)}"/>`);
    const rcx=w*(.77+(rnd()-.5)*.06), rcy=h*(.30+(rnd()-.5)*.08), rr=minDim*.16*sf;
    for(let i=0;i<3;i++) out.push(`<circle cx="${rcx.toFixed(1)}" cy="${rcy.toFixed(1)}" r="${(rr*(.72+i*.17)).toFixed(1)}" fill="none" stroke="#ffffff" stroke-opacity="${(.31-i*.06).toFixed(2)}" stroke-width="${Math.max(.7,state.thickness*.42)}"/>`);

    // Star/spark accent.
    const starX=w*(.52+(rnd()-.5)*.16), starY=h*(.52+(rnd()-.5)*.16), starR=minDim*.036*sf;
    const points=[];
    for(let i=0;i<8;i++){
      const a=-Math.PI/2+i*Math.PI/4, r=i%2===0?starR:starR*.13;
      points.push(`${(starX+Math.cos(a)*r).toFixed(1)},${(starY+Math.sin(a)*r).toFixed(1)}`);
    }
    out.push(`<polygon points="${points.join(" ")}" fill="#ffffff" fill-opacity=".94"/>`);

    // Subtle horizontal gradient band.
    out.push(`<rect x="0" y="${(h*.49).toFixed(1)}" width="${w}" height="${(h*.035).toFixed(1)}" fill="url(#${uid}_orange)" opacity=".27"/>`);

    // Minimal editorial typography.
    const labels=["ABSTRACT","WORKSHOP | LIVE","DESIGN INSPIRATION","GRAPHIC EXHIBITION"];
    const subs=["FORM / LIGHT","VOL. 01","MODERN STUDIES","VISUAL SYSTEM"];
    out.push(`<g font-family="Arial, Helvetica, sans-serif" fill="${dark}" opacity=".70">
      <text x="${(w*.08).toFixed(1)}" y="${(h*.08).toFixed(1)}" font-size="${Math.round(minDim*.025)}" font-weight="700" letter-spacing="${Math.max(1,minDim*.004)}">${labels[index%labels.length]}</text>
      <text x="${(w*.08).toFixed(1)}" y="${(h*.105).toFixed(1)}" font-size="${Math.round(minDim*.010)}" letter-spacing="${Math.max(.5,minDim*.002)}">${subs[index%subs.length]}</text>
      <text x="${(w*.08).toFixed(1)}" y="${(h*.93).toFixed(1)}" font-size="${Math.round(minDim*.009)}" letter-spacing="${Math.max(.5,minDim*.0015)}">DESIGN SYSTEM / ${String(index+1).padStart(2,"0")}</text>
      <text x="${(w*.84).toFixed(1)}" y="${(h*.935).toFixed(1)}" font-size="${Math.round(minDim*.009)}">2026</text>
    </g>`);

    return out.join("");
  }

  function modeSoftBlob(w,h,colors,rnd){
    let out="";
    for(let i=0;i<state.density+2;i++){
      const cx=rnd()*w,cy=rnd()*h,r=scaledR(Math.min(w,h)*(.1+rnd()*.18));
      out+=makeBlob(cx,cy,r,colors[i%colors.length],.72,state.strokeColor,state.thickness,Math.floor(rnd()*1e9));
    }
    return out;
  }

  function modeMandala(w,h,colors,rnd){
    let out=""; const cx=w/2,cy=h/2,layers=clamp(Math.round(state.density/2),3,14),arms=clamp(6+Math.round(state.frequency/10),6,18);
    for(let L=1;L<=layers;L++){
      const r=Math.min(w,h)*(.04+(L/layers)*.43)*shapeFactor(),rot=(state.phase+L*state.chaos*.9)*Math.PI/180;
      for(let a=0;a<arms;a++){
        const ang=Math.PI*2*a/arms+rot,x=cx+Math.cos(ang)*r*.72,y=cy+Math.sin(ang)*r*.72,rr=Math.min(w,h)*(.018+state.amplitude/4000)*shapeFactor();
        out+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr.toFixed(1)}" fill="${colors[L%colors.length]}" fill-opacity=".72" stroke="${state.strokeColor}" stroke-opacity="${aClamp(state.strokeOpacity)}" stroke-width="${Math.max(.5,state.thickness)}"/>`;
      }
      out+=`<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="${state.strokeColor}" stroke-opacity="${aClamp(state.strokeOpacity)}" stroke-width="${Math.max(.5,state.thickness)}"/>`;
    }
    out+=`<circle cx="${cx}" cy="${cy}" r="${(Math.min(w,h)*.04*shapeFactor()).toFixed(1)}" fill="${colors[0]}"/>`;
    return out;
  }

  function modeRetroWave(w,h,colors,rnd){
    let out=""; const lines=clamp(state.density+4,6,32),amp=Math.min(w,h)*(state.amplitude/500)*shapeFactor();
    for(let i=0;i<lines;i++){
      const y0=i/(lines-1)*h; let d=`M 0 ${y0.toFixed(1)}`;
      for(let x=0;x<=w;x+=Math.max(30,w/28)){const t=x/w*Math.PI*2*(1+state.frequency/25)+state.phase*Math.PI/180,y=y0+Math.sin(t+i*.45)*(amp*(.22+.78*state.frequency/100))+Math.cos(t*.5+i)*amp*.12;d+=` L ${x.toFixed(1)} ${y.toFixed(1)}`;}
      out+=`<path d="${d}" fill="none" stroke="${colors[i%colors.length]}" stroke-width="${1+state.thickness*.55}" stroke-opacity=".82"/>`;
    }
    return out;
  }

  function modeMinimal(w,h,colors,rnd){
    let out=""; for(let i=0;i<state.density;i++){const cx=rnd()*w,cy=rnd()*h,r=scaledR(Math.min(w,h)*(.06+rnd()*.16));out+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${colors[i%colors.length]}" stroke-width="${Math.max(1,state.thickness)}" stroke-opacity=".9"/>`;}
    return out;
  }

  function modeGeometric(w,h,colors,rnd){
    let out=""; for(let i=0;i<state.density+2;i++){const size=scaledR(Math.min(w,h)*(.08+rnd()*.22)),x=rnd()*w,y=rnd()*h,rot=state.phase+rnd()*state.chaos*3;out+=`<rect x="${(x-size/2).toFixed(1)}" y="${(y-size/2).toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${colors[i%colors.length]}" fill-opacity=".76" stroke="${state.strokeColor}" stroke-opacity="${aClamp(state.strokeOpacity)}" stroke-width="${state.thickness}"/>`;}
    return out;
  }

  function makePosterContents(index){
    const {w,h}=dims(); const baseSeed=Number(state.seed)||1; const rnd=mulberry32(baseSeed+index*10091);
    const palette=state.designMode === "modernGradientEditorial" ? modernPalettes[(Math.floor(baseSeed/7)+index)%modernPalettes.length] : palettes[(Math.floor(baseSeed/7)+index)%palettes.length];
    if(state.designMode !== "modernGradientEditorial"){
      // Existing design modes: use a vivid coordinated gradient background.
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
      return addBackground(w,h,state.bgColor,palette,baseSeed+index*37)+shapes;
    }
    return modeModernGradientEditorial(w,h,palette,rnd,index);
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
    const blob=new Blob([content],{type:mime}); const a=document.createElement("a");
    a.href=URL.createObjectURL(blob); a.download=filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  async function copyText(text){
    try{ await navigator.clipboard.writeText(text); alert("SVG copied to clipboard."); }
    catch(e){ const ta=document.createElement("textarea"); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); alert("SVG copied to clipboard."); }
  }

  function applyZoom(){ posterGrid.style.transform=`scale(${zoom})`; $("zoomLabel").textContent=`${Math.round(zoom*100)}%`; }

  function render(){
    state.posterCount=Number($("posterCount").value);
    posterGrid.innerHTML=""; generated=[];
    for(let i=0;i<state.posterCount;i++){
      const node=template.content.firstElementChild.cloneNode(true);
      node.querySelector(".poster-number").textContent=`POSTER ${String(i+1).padStart(2,"0")}`;
      const svg=makeSvg(i); generated.push(svg); node.querySelector(".poster-frame").innerHTML=svg;
      node.querySelector(".download-one").addEventListener("click",()=>download(`ali-studio-poster-${String(i+1).padStart(2,"0")}.svg`,generated[i]));
      node.querySelector(".copy-one").addEventListener("click",()=>copyText(generated[i]));
      posterGrid.appendChild(node);
    }
    applyZoom();
  }

  function updateOutputs(){
    const map={
      density:["densityVal",v=>v], frequency:["frequencyVal",v=>v+"%"], shapeSize:["shapeSizeVal",v=>v+"%"],
      blurAmount:["blurAmountVal",v=>v+"PX"], layoutChaos:["layoutChaosVal",v=>v+"%"], thickness:["thicknessVal",v=>v+"PX"],
      amplitude:["amplitudeVal",v=>v+"%"], phase:["phaseVal",v=>v+"°"], strokeOpacity:["strokeOpacityVal",v=>v+"%"]
    };
    for(const [id,[out,fmt]] of Object.entries(map)){ const el=$(id); if(el) $(out).textContent=fmt(el.value); }
  }

  function readControls(){
    const numericKeys=new Set(["posterCount","density","frequency","shapeSize","blurAmount","layoutChaos","thickness","amplitude","phase","chaos","strokeOpacity","artboardColumns","artboardGap"]);
    const keys=["posterCount","designMode","density","frequency","shapeSize","blurAmount","layoutChaos","thickness","amplitude","phase","chaos","format","quality","artboardColumns","artboardGap","bgColor","strokeColor","strokeOpacity"];
    for(const key of keys){ const el=$(key); if(!el) continue; state[key]=numericKeys.has(key)?Number(el.value):el.value; }
    state.seed=Number($("seed").value)||1;
  }

  function bind(){
    const ids=["posterCount","designMode","density","frequency","shapeSize","blurAmount","layoutChaos","thickness","amplitude","phase","chaos","seed","format","quality","artboardColumns","artboardGap","bgColor","strokeColor","strokeOpacity"];
    ids.forEach(id=>{ const el=$(id); if(!el) return; el.addEventListener("input",()=>{readControls();updateOutputs();render();}); el.addEventListener("change",()=>{readControls();updateOutputs();render();}); });
    $("regenerate").addEventListener("click",()=>{readControls();render();});
    $("randomize").addEventListener("click",()=>{
      $("seed").value=Math.floor(Math.random()*9999999)+1;
      $("phase").value=Math.floor(Math.random()*361); $("chaos").value=Math.floor(Math.random()*101);
      $("density").value=5+Math.floor(Math.random()*15); $("frequency").value=Math.floor(Math.random()*81);
      $("amplitude").value=80+Math.floor(Math.random()*121); $("shapeSize").value=50+Math.floor(Math.random()*91);
      readControls();updateOutputs();render();
    });
    $("downloadAll").addEventListener("click",()=>{
      generated.forEach((svg,i)=>setTimeout(()=>download(`ali-studio-poster-${String(i+1).padStart(2,"0")}.svg`,svg),i*140));
    });
    $("downloadJson").addEventListener("click",()=>download("ali-studio-settings.json",JSON.stringify(state,null,2),"application/json"));
    $("zoomIn").addEventListener("click",()=>{zoom=clamp(zoom+.1,.5,1.8);applyZoom();});
    $("zoomOut").addEventListener("click",()=>{zoom=clamp(zoom-.1,.5,1.8);applyZoom();});
  }

  // Load defaults to controls only where those controls exist.
  Object.entries(defaults).forEach(([k,v])=>{ if($(k)) $(k).value=v; });
  bind(); updateOutputs(); readControls(); render();
})();
