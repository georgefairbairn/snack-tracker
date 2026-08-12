// 16x16 sprites, NES-style: flat colours, no anti-aliasing, small palettes.
// '.' is transparent. Every row must be exactly 16 characters — test/sprites.test.mjs
// enforces that, because a short row silently shifts the whole image.

export const SPRITE_SIZE = 16;

export const SPRITES = {
  // ---- common ----------------------------------------------------------
  meerkat: {
    name: 'MEERKAT',
    palette: { t: '#b9762f', l: '#e8c08a', k: '#1a1208', n: '#3a2410' },
    rows: [
      '................',
      '.....tt..tt.....',
      '....tttttttt....',
      '...tllllllllt...',
      '...tlkllllkll...',
      '...tllllllllt...',
      '....tllnnlllt...',
      '....ttllllt.....',
      '......tttt......',
      '.....tllllt.....',
      '....tlllllltt...',
      '...tllllllllt...',
      '...tllllllllt...',
      '...tllllllllt...',
      '....tt....tt....',
      '................',
    ],
  },
  tortoise: {
    name: 'TORTOISE',
    palette: { s: '#3f7d3a', d: '#2a5528', l: '#7fc06a', k: '#12200f', y: '#c9b45a' },
    rows: [
      '................',
      '................',
      '.......ssssss...',
      '.....sslyyylss..',
      '....sdlyyyyyldd.',
      '...lldyyyyyyydd.',
      '..llkldyyyyydds.',
      '..lllldyyyyydds.',
      '...llddyyyyydd..',
      '....sddyyyydds..',
      '.....ssdddddss..',
      '......ss....ss..',
      '.....lll....lll.',
      '................',
      '................',
      '................',
    ],
  },
  penguin: {
    name: 'PENGUIN',
    palette: { k: '#141821', w: '#f2f4f8', o: '#e8912a', g: '#3a4252' },
    rows: [
      '................',
      '.....kkkkkk.....',
      '....kkkkkkkk....',
      '...kkwkkkkwkk...',
      '...kkwwkkwwkk...',
      '...kkkwooowkk...',
      '....kkkooookk...',
      '....kkwwwwkk....',
      '...kkwwwwwwkk...',
      '..kkkwwwwwwkkk..',
      '..kkkwwwwwwkkk..',
      '..kkkwwwwwwkkk..',
      '...kkwwwwwwkk...',
      '....kwwwwwwk....',
      '....ooo..ooo....',
      '................',
    ],
  },
  goat: {
    name: 'GOAT',
    palette: { w: '#e6e2d8', g: '#a8a294', k: '#1c1a16', h: '#6b5a3e' },
    rows: [
      '................',
      '...hh......hh...',
      '..hhh......hhh..',
      '..hh.wwwwww.hh..',
      '.....wwwwww.....',
      '....wwkwwkww....',
      '....wwwwwwww....',
      '....wwwwwwww....',
      '.....wwkkww.....',
      '......wggw......',
      '....wwwwwwww....',
      '...wwwwwwwwww...',
      '...wwwwwwwwww...',
      '...wwwwwwwwww...',
      '....ww....ww....',
      '....gg....gg....',
    ],
  },

  // ---- uncommon --------------------------------------------------------
  zebra: {
    name: 'ZEBRA',
    palette: { w: '#f4f2ee', k: '#17171a', g: '#8d8b86' },
    rows: [
      '................',
      '...........www..',
      '..........wwwww.',
      '..........wkwww.',
      '.........wwwwwww',
      '..wwwkwwkwwwwww.',
      '.wwkwwkwwkwwwww.',
      'wwkwwkwwkwwwww..',
      'wwkwwkwwkwwww...',
      'wwkwwkwwkwwww...',
      'wwwkwwkwwkwww...',
      '.wwwwwwwwwwww...',
      '..ww....www.....',
      '..ww....www.....',
      '..ww....www.....',
      '..gg....ggg.....',
    ],
  },
  flamingo: {
    name: 'FLAMINGO',
    palette: { p: '#f07ba8', k: '#1a1014', b: '#2b2b33', o: '#f0a04a' },
    rows: [
      '................',
      '........pppp....',
      '.......pkpppp...',
      '.......ppoooo...',
      '.......ppoo.....',
      '.......pp.......',
      '.......pp.......',
      '......pp........',
      '.....pppppp.....',
      '....pppppppp....',
      '...pppppppppp...',
      '...pppppppppp...',
      '....pppppppp....',
      '......pp.pp.....',
      '......bb.bb.....',
      '.....bbb.bbb....',
    ],
  },
  octopus: {
    name: 'OCTOPUS',
    palette: { p: '#8b4fc9', d: '#5f2f92', k: '#150c22', w: '#e8d9f7' },
    rows: [
      '................',
      '.....pppppp.....',
      '....pppppppp....',
      '...pppppppppp...',
      '...ppwkppwkpp...',
      '...pppppppppp...',
      '...pppppppppp...',
      '....pppppppp....',
      '...d.dddddd.d...',
      '..d.d.dddd.d.d..',
      '..d.d.d..d.d.d..',
      '.d..d.d..d.d..d.',
      '.d..d.d..d.d..d.',
      '.d..d.d..d.d..d.',
      '.dd.dd.dd.dd.dd.',
      '................',
    ],
  },
  toucan: {
    name: 'TOUCAN',
    palette: { k: '#16161c', o: '#f2a12c', y: '#f5d94a', w: '#f4f4f0', r: '#d8452f' },
    rows: [
      '................',
      '.....kkkk.......',
      '....kkkkkk......',
      '...kkwkkkkoooo..',
      '...kkkkkkoooyyo.',
      '...kkkkkkoyyyyo.',
      '...wwwwkkoooooo.',
      '..kwwwwwkk......',
      '..kkwwwwkk......',
      '..kkkkkkkk......',
      '..kkkkkkkk......',
      '...kkkkkkk......',
      '...kkkkkk.......',
      '....rr..rr......',
      '....rr..rr......',
      '................',
    ],
  },

  // ---- rare ------------------------------------------------------------
  elephant: {
    name: 'ELEPHANT',
    palette: { g: '#8e93a1', d: '#5f6470', k: '#1a1c22', w: '#e8eaf0' },
    rows: [
      '................',
      '..dd........dd..',
      '.dddd.gggg.dddd.',
      'ddddd.gggg.ddddd',
      'dddddggggggddddd',
      'dddddgwkwkgddddd',
      'dddddggggggddddd',
      '.ddddgggggg.ddd.',
      '..dd.gggggg..dd.',
      '.....ggggggg....',
      '....gggg.ggg....',
      '....ggg..ggg....',
      '....ggg..ggg....',
      '.....gg..ggg....',
      '.....gg...gg....',
      '....ddd...ddd...',
    ],
  },
  tiger: {
    name: 'TIGER',
    palette: { o: '#e8862a', k: '#1c1409', w: '#f7ead6', y: '#f5c04a' },
    rows: [
      '................',
      '...oo......oo...',
      '..okko....okko..',
      '..oooooooooooo..',
      '..okooooooooko..',
      '..oooooooooooo..',
      '..okwkooookwko..',
      '..oowwoooowwoo..',
      '..oookwwwwkooo..',
      '...ooowwwwooo...',
      '....oookkooo....',
      '...oooooooooo...',
      '..okooooooooko..',
      '..oooooooooooo..',
      '...oo.oooo.oo...',
      '...kk......kk...',
    ],
  },
  orca: {
    name: 'ORCA',
    palette: { k: '#15181f', w: '#f2f5fa', b: '#2c3c55' },
    rows: [
      '................',
      '.......kk.......',
      '......kkkk......',
      '.....kkkkkk.....',
      '...kkkkkkkkkk...',
      '..kkkkkkkkkkkkk.',
      '.kkkkkkkkkkkkkkk',
      'kkwwkkkkkkkkkkkk',
      'kkwwkkkkkkkkkkk.',
      'kkkkkkkkkkkkkk..',
      'kwwwwwwwwwwkkk..',
      '.kwwwwwwwwwkk...',
      '..kwwwwwwwkk....',
      '...kkkkkkkk.....',
      '..kkk....kkk....',
      '................',
    ],
  },
  gorilla: {
    name: 'GORILLA',
    palette: { k: '#2f2a26', d: '#15130f', b: '#8a6647', w: '#f0e0cc' },
    rows: [
      '................',
      '....kkkkkkkk....',
      '...kkkkkkkkkk...',
      '..kkkkkkkkkkkk..',
      '..kkbbbbbbbbkk..',
      '..kbbbbbbbbbbk..',
      '..kbbdwbbwdbbk..',
      '..kbbbbbbbbbbk..',
      '..kbbbwwwwbbbk..',
      '...kbbwddwbbk...',
      '..kkkbbwwwbkkk..',
      '.kkkkkbbbbkkkkk.',
      'kkkkkkkkkkkkkkkk',
      'kkkkkkkkkkkkkkkk',
      '.kk.kkkkkkkk.kk.',
      '.....kk..kk.....',
    ],
  },

  // ---- legendary -------------------------------------------------------
  bluewhale: {
    name: 'BLUE WHALE',
    palette: { b: '#3f6fd8', d: '#27488f', l: '#8fb4f5', w: '#eaf1ff' },
    rows: [
      '................',
      '......l.l.......',
      '.....l.l.l......',
      '......lll.......',
      '....bbbbbbbb....',
      '..bbbbbbbbbbbb..',
      '.bbbbbbbbbbbbbbb',
      'bwbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbb',
      'blllllllbbbbbbbd',
      '.lllllllbbbbdd..',
      '..lllllbbbdd....',
      '...dddddddd.....',
      '......dd..dd....',
      '.....dd....dd...',
      '................',
    ],
  },
  whiterhino: {
    name: 'WHITE RHINO',
    palette: { g: '#c2c0b8', d: '#8a887f', k: '#1e1d1a', w: '#f0eee6' },
    rows: [
      '................',
      '....w...........',
      '...ww......ddd..',
      '...www..........',
      '..wwww..........',
      '..gggwgggggg....',
      '.ggkgggggggggg..',
      '.ggggggggggggg..',
      'ggggggggggggggg.',
      'ggggggggggggggg.',
      '.gggggggggggggg.',
      '.gggggggggggggg.',
      '..gg.gg..gg.gg..',
      '..gg.gg..gg.gg..',
      '..gg.gg..gg.gg..',
      '..dd.dd..dd.dd..',
    ],
  },
  giantpanda: {
    name: 'GIANT PANDA',
    palette: { w: '#f4f4f0', k: '#1a1a1e', p: '#3a3a40' },
    rows: [
      '................',
      '...kk......kk...',
      '..kkkk....kkkk..',
      '..kkkkwwwwkkkk..',
      '...kwwwwwwwwk...',
      '...wwwwwwwwww...',
      '...wkkwwwwkkw...',
      '...wkkwwwwkkw...',
      '....wwwkkwww....',
      '.....wwkkww.....',
      '...kkwwwwwwkk...',
      '..kkkwwwwwwkkk..',
      '..kkkwwwwwwkkk..',
      '..kkkwwwwwwkkk..',
      '...kk.kkkk.kk...',
      '................',
    ],
  },

  // ---- secrets ---------------------------------------------------------
  hippo: {
    name: 'HIPPO',
    palette: { p: '#9b6f9e', d: '#6d4a72', k: '#1c1220', w: '#f0e0f2', r: '#d8607a' },
    rows: [
      '................',
      '...pp......pp...',
      '..pppp....pppp..',
      '..pppppppppppp..',
      '.ppppppppppppppp',
      '.ppkwppppppwkpp.',
      '.ppppppppppppppp',
      '.pppppppppppppp.',
      '.ddddddddddddd..',
      '.dwdwdwdwdwdwd..',
      '.drrrrrrrrrrrd..',
      '.drrrrrrrrrrrd..',
      '.dwdwdwdwdwdwd..',
      '..ddddddddddd...',
      '...pp......pp...',
      '................',
    ],
  },
  mouse: {
    name: 'MOUSE',
    palette: { g: '#9a9aa4', d: '#63636d', k: '#16161a', p: '#e8a0b4' },
    rows: [
      '................',
      '................',
      '..gg........gg..',
      '.gppg......gppg.',
      '.gppg......gppg.',
      '..gggggggggggg..',
      '..gggggggggggg..',
      '..gkggggggggkg..',
      '..ggggggggggggd.',
      '..ggggppgggggddd',
      '...gggggggggg..d',
      '...gggggggggg.d.',
      '....gggggggg..d.',
      '.....gg..gg...d.',
      '................',
      '................',
    ],
  },
};

/**
 * Renders a sprite as an inline SVG string. Horizontal runs of the same colour
 * are merged into single rects, which keeps the markup small enough to drop
 * several dozen sprites into the page without thinking about it.
 */
export function spriteSVG(key, { scale = 1, className = '' } = {}) {
  const sprite = SPRITES[key];
  if (!sprite) throw new Error(`Unknown sprite: ${key}`);
  const size = SPRITE_SIZE;
  const rects = [];

  sprite.rows.forEach((row, y) => {
    let x = 0;
    while (x < size) {
      const ch = row[x];
      if (ch === '.' || ch === undefined) { x++; continue; }
      let run = 1;
      while (x + run < size && row[x + run] === ch) run++;
      const fill = sprite.palette[ch];
      if (fill) rects.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${fill}"/>`);
      x += run;
    }
  });

  const px = size * scale;
  return `<svg class="${className}" width="${px}" height="${px}" viewBox="0 0 ${size} ${size}" `
    + `shape-rendering="crispEdges" role="img" aria-label="${sprite.name}">`
    + rects.join('') + '</svg>';
}

export function spriteName(key) {
  return SPRITES[key]?.name ?? key.toUpperCase();
}
