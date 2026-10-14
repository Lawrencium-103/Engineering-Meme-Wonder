/**
 * High-fidelity SVG art builders for flyers.
 *
 * These emit raw SVG fragments that resvg renders natively — so we get the
 * full static SVG spec (gradients, filters, clip paths, masks) for the
 * decorative layer, while Satori handles only text + layout. Art and text are
 * merged into one SVG document and rasterised together.
 */

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Soft textured paper: flat colour + a gentle radial vignette. */
export function paperBackground(w: number, h: number, bg: string, ink: string): string {
  return `
    <defs>
      <radialGradient id="avfVignette" cx="50%" cy="40%" r="78%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.5"/>
        <stop offset="58%" stop-color="#ffffff" stop-opacity="0.04"/>
        <stop offset="100%" stop-color="${ink}" stop-opacity="0.12"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="${bg}"/>
    <rect width="${w}" height="${h}" fill="url(#avfVignette)"/>`;
}

/** Classic double rule frame. */
export function doubleBorder(
  w: number,
  h: number,
  inset: number,
  outer: string,
  inner: string,
): string {
  const i2 = inset + 18;
  return `
    <rect x="${inset}" y="${inset}" width="${w - inset * 2}" height="${h - inset * 2}"
      fill="none" stroke="${outer}" stroke-width="3"/>
    <rect x="${i2}" y="${i2}" width="${w - i2 * 2}" height="${h - i2 * 2}"
      fill="none" stroke="${inner}" stroke-width="1" stroke-opacity="0.55"/>`;
}

/** A quarter vine with leaves, anchored to a corner. */
export function cornerFlourish(
  x: number,
  y: number,
  size: number,
  rotation: number,
  color: string,
): string {
  const vines: string[] = [];
  const shoots = [0, 32, -30];
  for (const turn of shoots) {
    // A curved shoot with two pointed leaves facing the tip and a berry dot
    // at the end, so the corner reads as a vine rather than a single feather.
    const r = 46 + turn * 0.24;
    const tip = 78 + Math.abs(turn) * 0.12;
    vines.push(
      `<g transform="rotate(${turn} 46 46)">` +
        `<path d="M6,94 C12,52 26,22 ${tip - 6},8" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>` +
        `<path d="M40,52 Q30,40 ${tip - 26},44 Q48,54 40,52 Z"/>` +
        `<path d="M58,32 Q52,20 ${tip - 14},24 Q64,32 58,32 Z"/>` +
        `<circle cx="${r}" cy="${104 - tip}" r="3.4"/>` +
        `</g>`,
    );
  }
  return `<g transform="translate(${x},${y}) rotate(${rotation}) scale(${size / 100})" fill="${color}" fill-opacity="0.85">
    ${vines.join("")}
  </g>`;
}

/** Symmetric botanical sprig. Points up at rotation 0. */
export function sprig(cx: number, cy: number, scale: number, color: string, rotation = 0): string {
  // Each leaf is a pointed petal: stem point -> tip -> back to stem, with
  // separate upper/lower controls so it bulges instead of reading as a flat
  // ellipse stacked on a pole (the old "pinecone" look). Tips lift outward.
  const pairs = [
    { y: -18, len: 30, lift: 20 },
    { y: -44, len: 26, lift: 18 },
    { y: -68, len: 20, lift: 15 },
  ];
  const leaves: string[] = [];
  for (const p of pairs) {
    for (const dir of [-1, 1]) {
      const tx = dir * p.len;
      const ty = p.y - p.lift;
      const cux = dir * p.len * 0.55;
      const cuy = p.y - p.lift * 0.75;
      const clx = dir * p.len * 0.45;
      const cly = p.y + 1;
      leaves.push(
        `<path d="M0,${p.y} Q${cux},${cuy} ${tx},${ty} Q${clx},${cly} 0,${p.y} Z"/>`,
      );
    }
  }
  return `<g transform="translate(${cx},${cy}) rotate(${rotation}) scale(${scale})" fill="${color}" fill-opacity="0.9">
    <path d="M0,16 C0,-14 0,-46 0,-80" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
    ${leaves.join("")}
    <circle cx="0" cy="-90" r="5"/>
  </g>`;
}

/** Two interlocking rings, one in each of the couple's colours. */
export function rings(cx: number, cy: number, r: number, c1: string, c2: string): string {
  const gap = r * 0.66;
  const sw = Math.max(3, r * 0.18);
  return `<g fill="none" stroke-linecap="round">
    <circle cx="${cx - gap}" cy="${cy}" r="${r}" stroke="${c1}" stroke-width="${sw}"/>
    <circle cx="${cx + gap}" cy="${cy}" r="${r}" stroke="${c2}" stroke-width="${sw}"/>
  </g>`;
}

/** Arch (rounded-top) rectangle path — the classic wedding photo frame. */
export function archPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2);
  return (
    `M${x},${y + h} L${x},${y + rr} ` +
    `Q${x},${y} ${x + rr},${y} ` +
    `L${x + w - rr},${y} ` +
    `Q${x + w},${y} ${x + w},${y + rr} ` +
    `L${x + w},${y + h} Z`
  );
}

/**
 * The masked photo: an arch <clipPath> around an <image>, with a soft drop
 * shadow (a filter Satori simply cannot do) and a gold keyline.
 */
export function archPhoto(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  href: string,
  stroke: string,
): string {
  const d = archPath(x, y, w, h, r);
  const outer = archPath(x - 16, y - 16, w + 32, h + 16, r + 16);
  return `
    <defs>
      <clipPath id="avfPhotoClip"><path d="${d}"/></clipPath>
      <filter id="avfPhotoShadow" x="-25%" y="-25%" width="150%" height="150%">
        <feDropShadow dx="0" dy="16" stdDeviation="22" flood-color="#000000" flood-opacity="0.26"/>
      </filter>
    </defs>
    <g filter="url(#avfPhotoShadow)">
      <path d="${d}" fill="#ffffff"/>
      <image href="${href}" xlink:href="${href}" x="${x}" y="${y}" width="${w}" height="${h}"
        preserveAspectRatio="xMidYMid slice" clip-path="url(#avfPhotoClip)"/>
    </g>
    <path d="${d}" fill="none" stroke="${stroke}" stroke-width="4"/>
    <path d="${outer}" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-opacity="0.55"/>`;
}

/** A thin divider with a central lozenge, used between sections. */
export function divider(cx: number, cy: number, halfWidth: number, color: string): string {
  return `<g stroke="${color}" stroke-width="1.4" stroke-opacity="0.7" fill="${color}">
    <line x1="${cx - halfWidth}" y1="${cy}" x2="${cx - 14}" y2="${cy}"/>
    <line x1="${cx + 14}" y1="${cy}" x2="${cx + halfWidth}" y2="${cy}"/>
    <path d="M${cx},${cy - 7} L${cx + 7},${cy} L${cx},${cy + 7} L${cx - 7},${cy} Z"/>
  </g>`;
}

/**
 * The arch keyline with no photo inside — the photo-less composition. Keeps the
 * frame's geometry so the layout reads as designed rather than collapsed, with
 * a botanical medallion clipped to the arch.
 */
export function archFrame(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  stroke: string,
  motif: string,
): string {
  const d = archPath(x, y, w, h, r);
  const outer = archPath(x - 16, y - 16, w + 32, h + 16, r + 16);
  return `
    <defs>
      <clipPath id="avfArchClip"><path d="${d}"/></clipPath>
    </defs>
    <path d="${d}" fill="#ffffff" fill-opacity="0.5"/>
    <g clip-path="url(#avfArchClip)">${motif}</g>
    <path d="${d}" fill="none" stroke="${stroke}" stroke-width="4"/>
    <path d="${outer}" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-opacity="0.55"/>`;
}

/* ------------------------------------------------------------------ *
 * Letterpress rules, medallions and the non-arch frames               *
 * ------------------------------------------------------------------ */

/** A straight hairline rule — letterpress bands, underlines, dividers. */
export function ruleLine(
  y: number,
  x1: number,
  x2: number,
  color: string,
  sw = 1.2,
  opacity = 1,
): string {
  return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${color}" stroke-width="${sw}" stroke-opacity="${opacity}" stroke-linecap="round"/>`;
}

/** The running warp of a loom: fine vertical threads, barely there. */
export function warpTexture(
  w: number,
  h: number,
  color: string,
  step = 13,
  opacity = 0.05,
): string {
  const lines: string[] = [];
  for (let x = step; x < w; x += step) {
    lines.push(
      `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${color}" stroke-width="1" stroke-opacity="${opacity}"/>`,
    );
  }
  return lines.join("");
}

/** A stroked circle — a medallion or seal ring. */
export function ringCircle(
  cx: number,
  cy: number,
  r: number,
  color: string,
  sw = 2,
  opacity = 1,
): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-opacity="${opacity}"/>`;
}

/** Rounded-rectangle path — the non-arch photo frame. */
export function roundRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  return (
    `M${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} ` +
    `V${y + h - rr} Q${x + w},${y + h} ${x + w - rr},${y + h} ` +
    `H${x + rr} Q${x},${y + h} ${x},${y + h - rr} ` +
    `V${y + rr} Q${x},${y} ${x + rr},${y} Z`
  );
}

/**
 * Right-angled corner bracket, rotated about the corner it marks.
 * rotation 0 = top-left, 90 = top-right, 180 = bottom-right, 270 = bottom-left.
 */
export function cornerBracket(
  x: number,
  y: number,
  size: number,
  rotation: number,
  color: string,
  sw = 3,
): string {
  return `<g transform="translate(${x},${y}) rotate(${rotation})" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="square">
    <path d="M0,${size} L0,0 L${size},0"/>
  </g>`;
}

/**
 * Rounded-rect masked photo with a double keyline and a soft drop shadow —
 * the counterpart to `archPhoto` for square/editorial compositions.
 */
export function framedPhoto(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  href: string,
  outer: string,
  inner: string,
): string {
  const d = roundRectPath(x, y, w, h, r);
  const outerD = roundRectPath(x - 15, y - 15, w + 30, h + 30, r + 12);
  const innerD = roundRectPath(x + 13, y + 13, w - 26, h - 26, Math.max(0, r - 8));
  return `
    <defs>
      <clipPath id="avfFrameClip"><path d="${d}"/></clipPath>
      <filter id="avfFrameShadow" x="-25%" y="-25%" width="150%" height="150%">
        <feDropShadow dx="0" dy="14" stdDeviation="20" flood-color="#000000" flood-opacity="0.22"/>
      </filter>
    </defs>
    <g filter="url(#avfFrameShadow)">
      <path d="${d}" fill="#ffffff"/>
      <image href="${href}" xlink:href="${href}" x="${x}" y="${y}" width="${w}" height="${h}"
        preserveAspectRatio="xMidYMid slice" clip-path="url(#avfFrameClip)"/>
    </g>
    <path d="${d}" fill="none" stroke="${outer}" stroke-width="4"/>
    <path d="${outerD}" fill="none" stroke="${outer}" stroke-width="1.4" stroke-opacity="0.5"/>
    <path d="${innerD}" fill="none" stroke="${inner}" stroke-width="2" stroke-opacity="0.85"/>`;
}

/** `framedPhoto` with no photo: the keyline plus a motif clipped inside. */
export function framedEmpty(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  outer: string,
  motif: string,
  o: { fill?: string; fillOpacity?: number } = {},
): string {
  const d = roundRectPath(x, y, w, h, r);
  const outerD = roundRectPath(x - 15, y - 15, w + 30, h + 30, r + 12);
  return `
    <defs>
      <clipPath id="avfFrameClip"><path d="${d}"/></clipPath>
    </defs>
    <path d="${d}" fill="${o.fill ?? "#ffffff"}" fill-opacity="${o.fillOpacity ?? 0.55}"/>
    <g clip-path="url(#avfFrameClip)">${motif}</g>
    <path d="${d}" fill="none" stroke="${outer}" stroke-width="4"/>
    <path d="${outerD}" fill="none" stroke="${outer}" stroke-width="1.4" stroke-opacity="0.5"/>`;
}

/* ------------------------------------------------------------------ *
 * Botanical and woven-cloth building blocks                           *
 * ------------------------------------------------------------------ */

/**
 * A fan of sprigs — the leaf cluster that scales, rotates and anchors
 * anywhere, so a design can grow foliage around any composition.
 */
export function leafCluster(
  cx: number,
  cy: number,
  rotation: number,
  scale: number,
  color: string,
  o: { spread?: number; count?: number } = {},
): string {
  const count = Math.max(2, o.count ?? 3);
  const spread = o.spread ?? 30;
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    // Fan from the shared root: the middle sprig longest, the outer two
    // shorter and rotated apart. The outer sprigs stay rooted at the same
    // point — offsetting them sideways is what tore clusters into arrows.
    const t = i / (count - 1) - 0.5; // -0.5 .. 0.5
    const a = rotation + t * spread;
    const s = scale * (1 - Math.abs(t) * 0.4);
    parts.push(sprig(cx, cy, s, color, a));
  }
  return parts.join("\n");
}

/**
 * A woven stripe band — Aso-Oke / Kente cloth.
 *
 * Uneven warp stripes with visible ground gaps plus faint weft threads read as
 * hand-woven cloth rather than a printed flag.
 */
export function weaveBand(
  x: number,
  y: number,
  w: number,
  h: number,
  stripes: string[],
  o: { bg?: string; opacity?: number } = {},
): string {
  const bg = o.bg ?? "#101430";
  const pattern = [14, 5, 26, 6, 9, 4, 20, 5, 7, 4];
  const rects: string[] = [];
  let cx = 0;
  let i = 0;
  while (cx < w) {
    const sw = Math.min(pattern[i % pattern.length], w - cx);
    rects.push(
      `<rect x="${cx}" y="0" width="${sw}" height="${h}" fill="${stripes[i % stripes.length]}"/>`,
    );
    cx += sw + 3;
    i++;
  }
  const weft: string[] = [];
  for (let ly = 5; ly < h; ly += 11) {
    weft.push(
      `<line x1="0" y1="${ly}" x2="${w}" y2="${ly}" stroke="#000000" stroke-opacity="0.16" stroke-width="1"/>`,
      `<line x1="0" y1="${ly + 1.5}" x2="${w}" y2="${ly + 1.5}" stroke="#ffffff" stroke-opacity="0.07" stroke-width="1"/>`,
    );
  }
  return `<g transform="translate(${x},${y})" opacity="${o.opacity ?? 1}">
    <rect width="${w}" height="${h}" fill="${bg}"/>
    ${rects.join("")}
    ${weft.join("")}
  </g>`;
}

/** A row of solid diamonds — the geometric accent of Yoruba cloth work. */
export function diamondRow(
  cx: number,
  cy: number,
  count: number,
  spacing: number,
  r: number,
  color: string,
  o: { opacity?: number; plus?: boolean } = {},
): string {
  const parts: string[] = [];
  const start = cx - ((count - 1) * spacing) / 2;
  for (let i = 0; i < count; i++) {
    const x = start + i * spacing;
    parts.push(`<path d="M${x},${cy - r} L${x + r},${cy} L${x},${cy + r} L${x - r},${cy} Z"/>`);
    if (o.plus) {
      parts.push(
        `<path d="M${x},${cy - r * 0.45} L${x + r * 0.45},${cy} L${x},${cy + r * 0.45} L${x - r * 0.45},${cy} Z" fill="#ffffff" fill-opacity="0.25"/>`,
      );
    }
  }
  return `<g fill="${color}" fill-opacity="${o.opacity ?? 1}">${parts.join("")}</g>`;
}

/** Vertical gradient ground — the dark cloth templates. */
export function gradientBackground(
  w: number,
  h: number,
  id: string,
  stops: { offset: number; color: string; opacity?: number }[],
): string {
  const list = stops
    .map(
      (s) =>
        `<stop offset="${s.offset}%" stop-color="${s.color}" stop-opacity="${s.opacity ?? 1}"/>`,
    )
    .join("");
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${list}</linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#${id})"/>`;
}

/* ------------------------------------------------------------------ *
 * Luxury / editorial / cultural primitives (NG-007 … NG-012)           *
 * ------------------------------------------------------------------ */

/**
 * A metallic "foil" gradient — the luxury look. Diagonal sweep with alternating
 * light/dark stops so it reads as brushed metal rather than a flat gold.
 * `hue` picks the metal: "gold" | "silver" | "rose".
 */
export function foilGradient(id: string, hue: "gold" | "silver" | "rose" = "gold"): string {
  const bands: Record<string, string[]> = {
    gold: ["#F7E7A1", "#D4AF37", "#8C6D1F", "#E9CE6B", "#B8912B"],
    silver: ["#F2F4F7", "#C0C6CF", "#8A929E", "#DFE3E9", "#A6ADB8"],
    rose: ["#F6D9D4", "#D98F86", "#A85A54", "#EAB7B0", "#C1756D"],
  };
  const c = bands[hue] ?? bands.gold;
  const stops = c
    .map((col, i) => `<stop offset="${(i / (c.length - 1)) * 100}%" stop-color="${col}"/>`)
    .join("");
  return (
    `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">` +
    `${stops}</linearGradient></defs>`
  );
}

/** A stroked rect painted with a foil gradient (frames, keylines, bands). */
export function foilRect(
  x: number,
  y: number,
  w: number,
  h: number,
  gradientId: string,
  sw = 3,
  rx = 0,
): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="none" stroke="url(#${gradientId})" stroke-width="${sw}"/>`;
}

/**
 * An eight-point star / arabesque medallion — the Nikah geometry.
 * Built from two rotated squares plus an inscribed rosette, so it reads as
 * Islamic star work rather than a generic sparkle.
 */
export function arabesque(cx: number, cy: number, r: number, color: string, sw = 2): string {
  const s = r * 0.62;
  const pts = (rot: number) => {
    const rad = (rot * Math.PI) / 180;
    return [0, 1, 2, 3]
      .map((i) => {
        const a = rad + (i * Math.PI) / 2;
        return `${(cx + Math.cos(a) * s).toFixed(1)},${(cy + Math.sin(a) * s).toFixed(1)}`;
      })
      .join(" ");
  };
  return `<g fill="none" stroke="${color}" stroke-width="${sw}" stroke-linejoin="round">
    <polygon points="${pts(0)}"/>
    <polygon points="${pts(45)}"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.22}" stroke-opacity="0.8"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.42}" stroke-opacity="0.4"/>
  </g>`;
}

/** A repeating arabesque border strip — top/foot band for the Nikah design. */
export function arabesqueBand(
  x: number,
  y: number,
  w: number,
  step: number,
  r: number,
  color: string,
  sw = 1.6,
): string {
  const parts: string[] = [];
  for (let cx = x + step / 2; cx <= w - step / 2; cx += step) {
    parts.push(arabesque(cx, y, r, color, sw));
  }
  return parts.join("\n");
}

/**
 * A soft watercolor bloom — layered translucent ellipses with a blurred edge.
 * Used behind the photo / as corner washes on the watercolor design.
 */
export function watercolorBloom(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
  o: { id: string; opacity?: number; rotate?: number } = { id: "avfWash" },
): string {
  const op = o.opacity ?? 0.5;
  const rot = o.rotate ?? 0;
  return `
    <defs>
      <filter id="${o.id}" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="${Math.round(rx * 0.18)}"/>
      </filter>
    </defs>
    <g transform="rotate(${rot} ${cx} ${cy})" filter="url(#${o.id})" opacity="${op}">
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}"/>
      <ellipse cx="${cx - rx * 0.25}" cy="${cy - ry * 0.2}" rx="${rx * 0.7}" ry="${ry * 0.66}" fill="${color}" fill-opacity="0.7"/>
      <ellipse cx="${cx + rx * 0.22}" cy="${cy + ry * 0.18}" rx="${rx * 0.62}" ry="${ry * 0.72}" fill="${color}" fill-opacity="0.6"/>
    </g>`;
}

/** A gentle vignette/scrim over a full-bleed photo so type stays legible. */
export function photoScrim(
  w: number,
  h: number,
  id: string,
  o: { top?: string; mid?: string; bottom?: string; topOp?: number; midOp?: number; bottomOp?: number } = {},
): string {
  const top = o.top ?? "#000000";
  const mid = o.mid ?? "#000000";
  const bottom = o.bottom ?? "#000000";
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${top}" stop-opacity="${o.topOp ?? 0.55}"/>
    <stop offset="45%" stop-color="${mid}" stop-opacity="${o.midOp ?? 0.35}"/>
    <stop offset="100%" stop-color="${bottom}" stop-opacity="${o.bottomOp ?? 0.72}"/>
  </linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#${id})"/>`;
}

/**
 * A full-bleed photo: the image covers the whole canvas (slice-cropped), ready
 * for a scrim + type on top. No frame — the photo IS the ground.
 */
export function bleedPhoto(w: number, h: number, href: string): string {
  return `<image href="${href}" xlink:href="${href}" x="0" y="0" width="${w}" height="${h}"
    preserveAspectRatio="xMidYMid slice"/>`;
}

/** A thin double keyline inset from the edge — luxury foil framing. */
export function insetKeylines(
  w: number,
  h: number,
  inset: number,
  outer: string,
  inner: string,
  swOuter = 2.5,
  swInner = 1,
): string {
  const i2 = inset + 16;
  return `
    <rect x="${inset}" y="${inset}" width="${w - inset * 2}" height="${h - inset * 2}" fill="none" stroke="${outer}" stroke-width="${swOuter}"/>
    <rect x="${i2}" y="${i2}" width="${w - i2 * 2}" height="${h - i2 * 2}" fill="none" stroke="${inner}" stroke-width="${swInner}" stroke-opacity="0.6"/>`;
}
