// Executed through Figma's connected Plugin API. SOURCE is injected from CSS.
const existing = await figma.variables.getLocalVariableCollectionsAsync();
if (existing.some(c => c.name === 'Poliyomino / Primitives')) throw new Error('Foundations already exist; inspect ledger before rerun.');
await Promise.all(['Regular','Medium','Bold','Extra Bold','Black'].map(style => figma.loadFontAsync({family:'Inter',style})));
await Promise.all(['Regular','Medium','Bold','Black'].map(style => figma.loadFontAsync({family:'Noto Sans KR',style})));
function rgba(css) {
 const m=css.match(/hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%(?:\s*\/\s*([\d.]+))?\s*\)/);
 if(!m) throw new Error('Unsupported color '+css);
 let h=Number(m[1])/360,s=Number(m[2])/100,l=Number(m[3])/100;
 const a=s*Math.min(l,1-l), f=n=>{const k=(n+h*12)%12;return l-a*Math.max(-1,Math.min(k-3,9-k,1));};
 return {r:f(0),g:f(8),b:f(4),a:m[4]===undefined?1:Number(m[4])};
}
const cols={}, vars={}, styles={text:{},effect:{},paint:{}};
for(const n of ['Primitives','Color','Metrics']) {const c=figma.variables.createVariableCollection('Poliyomino / '+n);c.renameMode(c.defaultModeId,'Default');cols[n]=c;}
function v(name,group,type,value,scopes,syntax,description){const a=figma.variables.createVariable(name,cols[group],type);a.scopes=scopes;a.setValueForMode(cols[group].defaultModeId,value);a.setVariableCodeSyntax('WEB',syntax);a.description=description;vars[name]=a;return a;}
function color(name,value,syntax,description){const key='raw/'+name;const p=v(key,'Primitives','COLOR',rgba(value),[],syntax,description);let scopes=name.startsWith('text/')||name.startsWith('modal/text')?['TEXT_FILL']:name.includes('border')||name.includes('line')?['STROKE_COLOR']:['FRAME_FILL','SHAPE_FILL'];if(name.startsWith('blue/')||name.startsWith('score/')||name.startsWith('accent'))scopes=['FRAME_FILL','SHAPE_FILL','TEXT_FILL','STROKE_COLOR'];return v(name,'Color','COLOR',{type:'VARIABLE_ALIAS',id:p.id},scopes,syntax,description);}
for(const [css,value] of Object.entries(SOURCE.variables)){
 if(/^hsl\([^)]*\)$/.test(value)) color(css.replace(/^--/,'').replace(/^(blue|text|surface|board|tray|panel|score|modal)-/,'$1/'),value,'var('+css+')','Observed: src/styles/global.css; '+css+' = '+value);
 else if(css.startsWith('--radius-'))v(css.slice(2).replace('-','/'),'Metrics','FLOAT',parseFloat(value),['CORNER_RADIUS'],'var('+css+')','Observed: src/styles/global.css');
}
for(const [name,value] of Object.entries(SOURCE.pieces))color('piece/'+name,value,'var(--piece-'+name+')','Figma token extracted from .piece-'+name+' in PieceShape.css; CSS variable name proposed, not yet in app.');
for(const [name,value] of Object.entries({combo:'hsl(18 90% 52%)',clear:'hsl(280 70% 56%)',multiline:'hsl(202 89% 48%)',placement:'hsl(150 65% 40%)',item:'hsl(330 75% 52%)',etc:'hsl(220 10% 45%)'}))color('category/'+name,value,'var(--category-'+name+')','Observed value in AugmentChoiceModal.css; CSS variable name proposed.');
for(const n of [0,2,3,4,5,6,7,8,10,12,14,16,18,22,24,28,32,40,48,64])v('space/'+n,'Metrics','FLOAT',n,['GAP'],'var(--space-'+n+')','Extracted spacing scale; proposed CSS token name.');
for(const n of [16,20,22,24,32,44,48,64,76,124])v('size/'+n,'Metrics','FLOAT',n,['WIDTH_HEIGHT'],'var(--size-'+n+')','Component dimensions; proposed CSS token name.');
v('radius/cell-44','Metrics','FLOAT',7.04,['CORNER_RADIUS'],'var(--cell-radius-44)','44px cell × 16% corner radius. Geometry-specific representation of --block-cell-radius.');
for(const [name,value]of Object.entries({fast:140,clear:260,celebration:940}))v('motion/'+name,'Metrics','FLOAT',value,[],'var(--motion-'+name+')','Milliseconds observed in CSS; proposed CSS token name.');
const types=[['Display','Inter','Black',72,76],['Score','Inter','Black',59.2,65.12],['Score mobile','Inter','Black',32,35.2],['Heading','Noto Sans KR','Black',28,36],['Title','Noto Sans KR','Black',20,28],['Button','Noto Sans KR','Bold',16,24],['Body','Noto Sans KR','Regular',16,24],['Small','Noto Sans KR','Medium',14,20],['Caption','Noto Sans KR','Bold',12,18],['Code','Inter','Medium',12,18]];
for(const [name,family,style,size,line]of types){const t=figma.createTextStyle();t.name='Poliyomino/'+name;t.fontName={family,style};t.fontSize=size;t.lineHeight={unit:'PIXELS',value:line};t.description=name.startsWith('Score')?'Source: ScoreBoard.css, 16px root.':'Standardized Figma role. Inter for Latin/numerals; Noto Sans KR is the explicit design-side Korean fallback.';styles.text[name]=t.id;}
for(const [name,css]of Object.entries(SOURCE.variables).filter(([k])=>k.startsWith('--shadow-')||k.startsWith('--modal-shadow-'))){const col=rgba(css);const nums=css.split('hsl')[0].match(/-?[\d.]+/g).map(Number);const s=figma.createEffectStyle();s.name='Poliyomino/'+name.slice(2).replace(/-/g,'/');s.effects=[{type:css.startsWith('inset')?'INNER_SHADOW':'DROP_SHADOW',color:col,offset:{x:nums[0],y:nums[1]},radius:nums[2]||0,spread:0,visible:true,blendMode:'NORMAL'}];styles.effect[name.slice(2)]=s.id;}
function gradient(name,colors){const s=figma.createPaintStyle();s.name='Poliyomino/'+name;s.paints=[{type:'GRADIENT_LINEAR',gradientTransform:[[0,1,0],[-1,0,1]],gradientStops:colors.map((c,i)=>({position:i/(colors.length-1),color:rgba(c)}))}];styles.paint[name]=s.id;}
gradient('Page gradient',['hsl(200 85% 60%)','hsl(205 84% 50%)','hsl(209 80% 40%)']);
gradient('Action gradient',['hsl(205 90% 46%)','hsl(207 88% 39%)']);
const pages={};const first=figma.root.children[0];first.name='00 · Foundations';pages.foundations=first.id;
for(const [key,name]of [['components','01 · Components'],['patterns','02 · Patterns']]){const p=figma.createPage();p.name=name;pages[key]=p.id;}
return {createdNodeIds:Object.values(pages).slice(1),mutatedNodeIds:[first.id],pages,collections:Object.fromEntries(Object.entries(cols).map(([k,c])=>[k,c.id])),variables:Object.fromEntries(Object.entries(vars).map(([k,a])=>[k,a.id])),styles,counts:{variables:Object.keys(vars).length,textStyles:Object.keys(styles.text).length,effectStyles:Object.keys(styles.effect).length,paintStyles:Object.keys(styles.paint).length},scope:'Full design system v1: foundations, core game components, documented patterns; source references in component descriptions, no library publishing.'};
