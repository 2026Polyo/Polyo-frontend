import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Read-only extraction of application sources; writes this audit's JSON only.
const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'design-system', 'source-tokens.json');
const absolute = rel => path.join(root, rel).replaceAll('\\', '/');
const read = rel => fs.readFileSync(absolute(rel), 'utf8');
const sourceAt = (rel, index) => ({ path: absolute(rel), line: read(rel).slice(0, index).split('\n').length });
const findSource = (rel, text) => sourceAt(rel, Math.max(0, read(rel).indexOf(text)));
const observed = (rel, text) => ({ status: 'observed', source: findSource(rel, text) });

function hsl(css) {
  const match = css.match(/^hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%(?:\s*\/\s*([\d.]+))?\s*\)$/);
  if (!match) throw new Error(`Unsupported color: ${css}`);
  const h = Number(match[1]) / 360, s = Number(match[2]) / 100, l = Number(match[3]) / 100;
  const a = match[4] === undefined ? 1 : Number(match[4]);
  const hue = (p, q, t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const rgb = s === 0 ? [l,l,l] : [hue(p,q,h+1/3), hue(p,q,h), hue(p,q,h-1/3)];
  return { r: rgb[0], g: rgb[1], b: rgb[2], a, hex: '#' + rgb.map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('').toUpperCase() };
}

function rules(rel) {
  const original = read(rel);
  // Preserve length/newlines so offsets still point into the original file.
  const css = original.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
  const output = [];
  function walk(start, end, conditions) {
    let cursor = start;
    while (cursor < end) {
      const open = css.indexOf('{', cursor);
      if (open < 0 || open >= end) break;
      const headerStart = cursor + css.slice(cursor, open).search(/\S/);
      const header = css.slice(cursor, open).trim();
      let depth = 1, close = open + 1;
      while (close < end && depth) { if (css[close] === '{') depth++; if (css[close] === '}') depth--; close++; }
      if (css.slice(open + 1, close - 1).includes('{')) walk(open + 1, close - 1, [...conditions, header]);
      else {
        const declarations = {};
        for (const m of css.slice(open + 1, close - 1).matchAll(/([\w-]+)\s*:\s*([^;]+);/g)) declarations[m[1]] = m[2].trim().replace(/\s+/g, ' ');
        output.push({ selector: header.replace(/\s+/g,' '), conditions, declarations, source: sourceAt(rel, headerStart) });
      }
      cursor = close;
    }
  }
  walk(0, css.length, []);
  return output;
}

const globalRel = 'src/styles/global.css', globalText = read(globalRel);
const tokens = { colors: [], radius: [], shadows: [] };
for (const m of globalText.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
  const sourceName = m[1], value = m[2].trim();
  const item = { sourceName, value, source: sourceAt(globalRel, m.index), status: 'observed' };
  if (value.startsWith('hsl(')) tokens.colors.push({ ...item, category: sourceName.startsWith('--blue-') && sourceName !== '--blue-shadow' ? 'primitive' : 'semantic', ...hsl(value) });
  else if (sourceName.includes('radius')) tokens.radius.push({ ...item, numericValue: Number.parseFloat(value), unit: value.endsWith('%') ? '%' : 'px' });
  else if (sourceName.includes('shadow')) tokens.shadows.push(item);
  else throw new Error(`Uncategorized CSS variable ${sourceName}`);
}
const colorMap = Object.fromEntries(tokens.colors.map(t=>[t.sourceName,t]));
const styleFiles = fs.readdirSync(path.join(root,'src/styles')).filter(x=>x.endsWith('.css')).sort().map(x=>'src/styles/'+x);
const allRules = styleFiles.flatMap(rules);
const pieceRules = rules('src/styles/PieceShape.css');
const blockNames = ['cyan','lime','amber','rose','violet','blue','teal','orange','pink','green','indigo'];
const effectNames = ['ghost','line','echo','golden','bomb','fill','boost'];
function piece(name) {
  const rule = pieceRules.find(r=>r.selector === '.piece-'+name);
  const paints = [...Object.values(rule.declarations).join(' ').matchAll(/hsl\([^)]*\)/g)].map(m=>({ value: m[0], ...hsl(m[0]) }));
  return { name, cssClass: rule.selector, status: 'observed', declarations: rule.declarations, colors: paints, source: rule.source };
}

const typeSelectors = new Set([':root','h1','p','.start-screen h1','.start-actions .primary-action, .start-actions .secondary-action','.primary-action','.secondary-action','.score-box strong','.score-preview-gain','.best-score-badge strong','.start-best strong','.game-settings-title','.game-settings-menu-button','.augment-choice-heading strong','.augment-choice-title','.augment-choice-summary','.augment-choice-type','.augment-choice-effect','.augment-level','.augment-detail-copy strong','.augment-detail-copy p','.undo-item-label','.undo-item-detail p','.deck-heading strong','.deck-heading span','.deck-section-title','.deck-tile-label','.reroll-heading strong','.reroll-hint','.block-reward-heading strong','.block-reward-text','.game-over h2','.game-over-score strong','.combo-burst','.clear-burst']);
const typographyStyles = allRules.filter(r=>typeSelectors.has(r.selector)).map(r=>({
  selector: r.selector, conditions: r.conditions, status: 'observed', source: r.source,
  properties: Object.fromEntries(Object.entries(r.declarations).filter(([k])=>/^(font|line-height|letter-spacing|text-transform|color)/.test(k)))
})).filter(r=>Object.keys(r.properties).length);
const spacing = new Map(), duration = new Map();
for (const r of allRules) for (const [property,value] of Object.entries(r.declarations)) {
  if (/^(gap|row-gap|column-gap|padding|margin)(-|$)/.test(property)) {
    for (const m of value.matchAll(/(?<![\d.-])(-?[\d.]+)px/g)) {
      const n = Number(m[1]), old = spacing.get(n) ?? { value: n, unit: 'px', status: 'observed', count: 0, examples: [] };
      old.count++;
      if (old.examples.length < 3) old.examples.push({ selector: r.selector, property, cssValue: value, conditions: r.conditions, source: r.source });
      spacing.set(n,old);
    }
  }
  if (property === 'animation' || property === 'transition') {
    for (const m of value.matchAll(/([\d.]+)(ms|s)\b/g)) {
      const n = Number(m[1]) * (m[2] === 's' ? 1000 : 1), old = duration.get(n) ?? { milliseconds: n, status: 'observed', examples: [] };
      if (old.examples.length < 4) old.examples.push({ selector: r.selector, property, cssValue: value, conditions: r.conditions, source: r.source });
      duration.set(n,old);
    }
  }
}

const components = [
  { name:'Button', variants:['primary','secondary','icon','settings','deck-action','close'], states:['default','hover','active'], optionalStates:['disabled (native attribute; not uniformly styled)','focus-visible (component-specific)'], sourceFiles:['src/styles/App.css','src/styles/ScoreBoard.css','src/styles/StartScreen.css','src/styles/DeckModal.css'], note:'No shared Button TSX abstraction; CSS classes are reused.' },
  { name:'Board / Cell', variants:['empty','11 normal block colors','7 special effects'], states:['filled','preview','preview-clearing','clearing','focus-visible'], sourceFiles:['src/components/Board.tsx','src/styles/Board.css'], layout:'8 by 8; square; gap 3px/padding 10px, mobile 2px/7px' },
  { name:'PieceShape', variants:['shape footprint','normal color','special effect','preview size'], states:['default'], sourceFiles:['src/components/PieceShape.tsx','src/styles/PieceShape.css'] },
  { name:'PiecePreview / Tray', variants:['three slots','desktop','mobile'], states:['default','selected','empty','focus-visible','disabled (native)'], sourceFiles:['src/components/PiecePreview.tsx','src/components/PieceTray.tsx','src/styles/PieceTray.css'] },
  { name:'CursorPiece', variants:['shape','normal/special color'], states:['valid','invalid'], sourceFiles:['src/screens/PlayScreen.tsx','src/styles/PieceShape.css'] },
  { name:'Score', variants:['current','best badge','placement gain'], states:['idle','is-counting','gain visible','gain hidden'], sourceFiles:['src/components/ScoreBoard.tsx','src/styles/ScoreBoard.css'] },
  { name:'ItemSlot', variants:['undo','reroll','gravity','desktop tile','mobile row'], states:['available','empty','active','unavailable','disabled','focus-visible'], sourceFiles:['src/components/ItemSlots.tsx','src/styles/ItemSlots.css'], children:['icon','quantity badge','detail popover','disabled reason','use button'] },
  { name:'AugmentTile / Panel', variants:['icon and level','detail','desktop grid','mobile accordion'], states:['empty','default','hover','focus-visible','active','expanded','collapsed'], sourceFiles:['src/components/AugmentPanel.tsx','src/styles/AugmentPanel.css'] },
  { name:'ChoiceCard', variants:['augment','special block','desktop portrait','mobile horizontal'], states:['default','new','hover','focus-visible'], sourceFiles:['src/components/AugmentChoiceModal.tsx','src/components/SpecialChoiceModal.tsx','src/styles/AugmentChoiceModal.css'], children:['category badge','icon/shape','title','summary','effect pill','new badge'] },
  { name:'CategoryBadge', variants:['combo','clear','multiline','placement','item','etc'], states:['default'], sourceFiles:['src/styles/AugmentChoiceModal.css'] },
  { name:'DeckTile', variants:['normal','special','read-only','selectable'], states:['default','hover','focus-visible','selected','disabled','selected-disabled'], sourceFiles:['src/components/DeckModal.tsx','src/components/StartDeckModal.tsx','src/styles/DeckModal.css'], children:['shape','label','checkmark','count'] },
  { name:'DeckBuilder', variants:['desktop two columns','mobile single column with current deck hidden'], states:['empty deck section','partial count','complete count'], sourceFiles:['src/components/StartDeckModal.tsx','src/styles/DeckModal.css'] },
  { name:'Reroll', variants:['slot selection','candidate selection','deck selection'], states:['unselected','selected','confirm enabled','confirm disabled'], sourceFiles:['src/components/RerollModal.tsx','src/styles/RerollModal.css'] },
  { name:'Modal', variants:['settings','deck viewer','deck builder','augment choice','special choice','reroll','block reward','game over'], states:['open','closed'], sourceFiles:['src/components/GameSettingsMenu.tsx','src/components/DeckModal.tsx','src/components/StartDeckModal.tsx','src/components/AugmentChoiceModal.tsx','src/components/SpecialChoiceModal.tsx','src/components/RerollModal.tsx','src/components/BlockRewardModal.tsx','src/components/GameOver.tsx'] },
  { name:'StartScreen', variants:['new game only','saved game available'], states:['new game enabled','new game disabled'], sourceFiles:['src/components/StartScreen.tsx','src/styles/StartScreen.css'] },
  { name:'Feedback', variants:['combo burst','clear burst','automatic undo flash','block reward pop','score count','cell clear'], states:['animated','hidden'], sourceFiles:['src/styles/App.css','src/styles/AutoUndoFlash.css','src/styles/BlockRewardModal.css','src/styles/ScoreBoard.css','src/styles/Board.css'] }
].map(c=>({...c,status:'observed',sourceFiles:c.sourceFiles.map(absolute)}));
const breakpointMap = new Map();
for (const r of allRules) for (const condition of r.conditions) {
  const m = condition.match(/^@media \(max-width: (\d+)px\)$/);
  if (!m) continue;
  const px = Number(m[1]), entry = breakpointMap.get(px) ?? { maxWidthPx:px,status:'observed',mediaQuery:condition,sourceFiles:[],examples:[] };
  if (!entry.sourceFiles.includes(r.source.path)) entry.sourceFiles.push(r.source.path);
  if (entry.examples.length<3) entry.examples.push({selector:r.selector,source:r.source});
  breakpointMap.set(px,entry);
}
const breakpointNotes = {
  1520:'Three columns collapse into a 620px single-column layout; item/augment regions move above board.',
  720:'Mobile play area max 480px. Items are horizontal 48px slots. Augment region becomes collapsible. Choice cards stack and change to horizontal information layout. Board gap/padding and tray size reduce.',
  460:'Narrow settings dialog; smaller deck button and topbar alignment. Some earlier rules are superseded by the later 720px play-shell rules.'
};

const luminance = c => [c.r,c.g,c.b].map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
function pair(id, fg, bg, usage, rel, selector, kind='text', note='') {
  const resolve = value => colorMap[value] ?? hsl(value);
  const f=resolve(fg), b=resolve(bg), ls=[luminance(f),luminance(b)].sort((a,b)=>b-a);
  const ratio=(ls[0]+.05)/(ls[1]+.05);
  return {id,foreground:fg,foregroundHex:f.hex,background:bg,backgroundHex:b.hex,ratio:Number(ratio.toFixed(3)),kind,usage,note,normalTextAA:ratio>=4.5,largeTextAA:ratio>=3,nonTextContrast3to1:ratio>=3,...observed(rel,selector)};
}
const contrastPairs = [
  pair('primary-white-on-accent','hsl(0 0% 100%)','--accent','Primary action gradient bright endpoint','src/styles/App.css','.primary-action'),
  pair('primary-white-on-accent-strong','hsl(0 0% 100%)','--accent-strong','Primary action gradient dark endpoint','src/styles/App.css','.primary-action'),
  pair('secondary-strong-on-white','--text-strong','--surface-card','Secondary action label','src/styles/App.css','.secondary-action'),
  pair('modal-body-on-bg','--modal-text-body','--modal-bg','Item description on modal background','src/styles/ItemSlots.css','.undo-item-detail p'),
  pair('modal-muted-on-surface','--modal-text-muted','--modal-surface','Augment choice summary','src/styles/AugmentChoiceModal.css','.augment-choice-summary'),
  pair('modal-muted-on-bg','--modal-text-muted','--modal-bg','Reroll hint','src/styles/RerollModal.css','.reroll-hint'),
  pair('modal-title-on-surface','--modal-text','--modal-surface','Augment card title','src/styles/AugmentChoiceModal.css','.augment-choice-title'),
  pair('new-gold-title-on-modal','hsl(54 100% 44%)','--modal-surface','New augment card title','src/styles/AugmentChoiceModal.css','.augment-choice-card.new .augment-choice-title'),
  pair('item-white-on-panel-slot','hsl(0 0% 100%)','--panel-slot','Item label in available slot','src/styles/ItemSlots.css','.undo-item-label'),
  pair('item-white-on-slot-hover','hsl(0 0% 100%)','--panel-slot-hover','Item label in hovered/active slot','src/styles/ItemSlots.css','.undo-item.active'),
  pair('icon-white-on-blue-300','hsl(0 0% 100%)','--blue-300','White icon on gradient bright endpoint','src/styles/ItemSlots.css','.undo-item-icon','icon'),
  pair('icon-white-on-blue-500','hsl(0 0% 100%)','--blue-500','White icon on gradient dark endpoint','src/styles/ItemSlots.css','.undo-item-icon','icon'),
  ...['--surface-page-top','--surface-page-mid','--surface-page-bottom'].flatMap(bg=>[
    pair('score-strong-on-'+bg.slice(2),'--text-strong',bg,'Current score/title over page gradient (endpoint sample)','src/styles/ScoreBoard.css','.score-box strong','text','Gradient endpoint estimate; actual foreground position, radial white overlay and text shadows are not rendered here.'),
    pair('gold-on-'+bg.slice(2),'--score-gold',bg,'Best score badge over page gradient (endpoint sample)','src/styles/ScoreBoard.css','.best-score-badge','text','Gradient endpoint estimate; shadow excluded.'),
    pair('muted-on-'+bg.slice(2),'--text-muted',bg,'Saved score / empty augment text over page gradient (endpoint sample)','src/styles/StartScreen.css','.start-saved-score','text','Gradient endpoint estimate; actual background varies with viewport and position.')
  ])
];
const categoryBadges=allRules.filter(r=>r.selector.startsWith('.augment-choice-type.type-')).map(r=>({name:r.selector.split('.type-')[1],value:r.declarations.background,...hsl(r.declarations.background),source:r.source,status:'observed'}));
categoryBadges.forEach(t=>contrastPairs.push(pair('category-'+t.name,'hsl(0 0% 100%)',t.value,'White small category badge text','src/styles/AugmentChoiceModal.css','.augment-choice-type.type-'+t.name)));

const result = {
  schemaVersion:1,
  meta:{ project:'Polyomino', generatedAt:new Date().toISOString(), sourceRoot:root.replaceAll('\\','/'), scope:'Current working tree, including existing uncommitted edits. App files are read only.', purpose:'Canonical observed source values for Figma design-system construction.', extractionScript:absolute('design-system/extract-source-tokens.mjs'), sourceSha256:Object.fromEntries(styleFiles.map(rel=>[rel,crypto.createHash('sha256').update(read(rel)).digest('hex')])) },
  sourceTokens:tokens,
  blockPalette:{normal:blockNames.map(piece),special:effectNames.map(piece)},
  categoryBadges,
  typography:{status:'observed',fontFamily:allRules.find(r=>r.selector===':root').declarations['font-family'],fontAssetNote:'Inter is named in the stack; no @font-face or explicit external font loading was found in the inspected CSS/index.html. Korean glyphs use available fallback fonts.',rootSizeAssumptionForFigma:'No explicit root font-size. rem-to-pixel examples require the browser default 16px assumption; original rem/clamp expressions remain authoritative.',styles:typographyStyles},
  spacing:{status:'observed',hasSharedCssTokens:false,notes:'Unique px values extracted only from padding/margin/gap declarations. Values inside responsive expressions are recorded, not asserted to be a coherent spacing scale.',values:[...spacing.values()].sort((a,b)=>a.value-b.value)},
  motion:{status:'observed',hasSharedCssTokens:false,durations:[...duration.values()].sort((a,b)=>a.milliseconds-b.milliseconds),reducedMotionRules:allRules.filter(r=>r.conditions.some(c=>c.includes('prefers-reduced-motion')))},
  components,
  responsive:{status:'observed',breakpoints:[...breakpointMap.values()].sort((a,b)=>a.maxWidthPx-b.maxWidthPx).map(b=>({...b,behavior:breakpointNotes[b.maxWidthPx]})),minBodyWidthPx:320,desktopGameMaxWidthPx:1920,desktopBoardColumnMaxWidthPx:600,mobileGameMaxWidthPx:480,source:findSource('src/styles/App.css','.game-area')},
  contrastAudit:{status:'calculated-from-observed-values',method:'sRGB relative luminance: channel <= 0.04045 => channel/12.92, else ((channel+0.055)/1.055)^2.4; L=0.2126R+0.7152G+0.0722B; ratio=(Llighter+0.05)/(Ldarker+0.05). RGB values are not rounded before calculation.',thresholds:{normalTextAA:4.5,largeTextAA:3,nonText:3},limitations:'Static foreground/background pairs only. This is a likely-risk audit, not a rendered accessibility certification. Endpoint samples do not account for radial overlays, shadow outlines, exact viewport position, antialiasing or disabled-control exemptions. Classification of a text style as large must use its actual rendered size and weight.',pairs:contrastPairs,likelyRisks:contrastPairs.filter(p=>p.kind==='icon'?!p.nonTextContrast3to1:!p.normalTextAA).map(p=>({id:p.id,ratio:p.ratio,usage:p.usage,reason:p.kind==='icon'?'Below 3:1 icon reference threshold':p.largeTextAA?'Below 4.5:1 normal text; may pass only if actual text qualifies as large':'Below 3:1 and 4.5:1 text reference thresholds'}))},
  proposedImprovements:[
    {status:'proposed-not-applied',area:'Naming',proposal:'Map existing CSS colors to Figma primitive and semantic variables, keeping the original sourceName in descriptions. White cards and dark modals are simultaneous surface families, not existing light/dark theme modes.'},
    {status:'proposed-not-applied',area:'Typography',proposal:'Create named text styles from the observed roles; settle an explicitly available Korean/Latin font pairing before treating fallback rendering as visually canonical.'},
    {status:'proposed-not-applied',area:'Spacing',proposal:'Normalize a shared spacing scale only after review. Do not silently replace the extracted 3/5/7/14/18/22px values with a new 4px scale.'},
    {status:'proposed-not-applied',area:'State coverage',proposal:'Add consistent primary/secondary disabled and focus-visible treatments; keep existing board, item and deck states.'},
    {status:'proposed-not-applied',area:'Contrast',proposal:'Review the calculated risks, especially white icons on light blue, normal white text on accent/slot fills, category labels, and muted text over the page gradient. Preserve observed colors in the source library and mark any revised contrast-safe palette separately.'},
    {status:'proposed-not-applied',area:'Motion',proposal:'Promote observed timings to named motion tokens and define reduced-motion behavior for burst/cell/score animations; existing reduced-motion CSS only targets auto-undo effects.'}
  ],
  contentMismatches:[
    {status:'observed',detail:'Brand naming differs: README heading Polyo, start screen Polyomino, HTML title Block Blast React.',sources:[findSource('README.md','# Polyo'),findSource('src/components/StartScreen.tsx','<h1'),findSource('index.html','<title>')]},
    {status:'observed',detail:'README describes basic deck up to 20, while disabled start action copy requires 10 normal blocks. Source UI copy should be reviewed before documentation is frozen.',sources:[findSource('README.md','총 20개까지'),findSource('src/components/StartScreen.tsx','일반 블록 10개')]}]
};
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({path:out,colors:tokens.colors.length,radii:tokens.radius.length,shadows:tokens.shadows.length,blocks:result.blockPalette.normal.length,specials:result.blockPalette.special.length,components:components.length,contrastPairs:contrastPairs.length,risks:result.contrastAudit.likelyRisks},null,2));
