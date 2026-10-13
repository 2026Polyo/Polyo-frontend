// STATE and TARGET_PAGE are injected by the orchestrator.
await Promise.all(['Regular','Medium','Bold','Extra Bold','Black'].map(style=>figma.loadFontAsync({family:'Inter',style})));
await Promise.all(['Regular','Medium','Bold','Black'].map(style=>figma.loadFontAsync({family:'Noto Sans KR',style})));
const page=await figma.getNodeByIdAsync(TARGET_PAGE);await figma.setCurrentPageAsync(page);
const V=Object.fromEntries((await figma.variables.getLocalVariablesAsync()).map(v=>[v.name,v]));
const made=[];const roots=[];const components={};const notes=[];
function record(n){made.push(n.id);return n;}
function solid(name){if(!V[name])throw new Error('Unknown token '+name);return figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:0,g:0,b:0}},'color',V[name]);}
function fill(n,name){n.fills=name?[solid(name)]:[];}
function stroke(n,name,width=1){n.strokes=[solid(name)];n.strokeWeight=width;}
function radius(n,name='radius/md'){for(const p of ['topLeftRadius','topRightRadius','bottomLeftRadius','bottomRightRadius'])n.setBoundVariable(p,V[name]);}
function spacing(n,gap=0,pad=0){n.itemSpacing=gap;n.setBoundVariable('itemSpacing',V['space/'+gap]);for(const p of ['paddingTop','paddingBottom','paddingLeft','paddingRight'])n.setBoundVariable(p,V['space/'+pad]);}
function layout(name,direction='VERTICAL',gap=16,pad=0,color=null){const n=record(figma.createAutoLayout(direction));n.name=name;fill(n,color);spacing(n,gap,pad);n.primaryAxisSizingMode='AUTO';n.counterAxisSizingMode='AUTO';n.clipsContent=false;return n;}
function append(parent,n){parent.appendChild(n);return n;}
async function text(parent,content,role='Body',color='text/strong',width){const n=record(figma.createText());n.name=content.slice(0,54);n.fontName={family:'Inter',style:'Regular'};await n.setTextStyleIdAsync(STATE.styles.text[role]);n.characters=content;fill(n,color);if(width){n.textAutoResize='HEIGHT';n.resize(width,Math.max(18,n.height));}else n.textAutoResize='WIDTH_AND_HEIGHT';append(parent,n);return n;}
function rect(parent,name,w,h,color,rad){const n=record(figma.createRectangle());n.name=name;n.resize(w,h);fill(n,color);if(rad)radius(n,rad);append(parent,n);return n;}
function component(name,w,h,color,dir='HORIZONTAL',gap=8,pad=12){const n=record(figma.createComponent());n.name=name;n.resize(w,h);n.layoutMode=dir;n.primaryAxisSizingMode='FIXED';n.counterAxisSizingMode='FIXED';n.primaryAxisAlignItems='CENTER';n.counterAxisAlignItems='CENTER';spacing(n,gap,pad);fill(n,color);radius(n);n.clipsContent=false;return n;}
function prop(c,n,name,defaultValue){const key=c.addComponentProperty(name,'TEXT',defaultValue);n.componentPropertyReferences={characters:key};return key;}
function instance(c,parent){const n=record(c.createInstance());append(parent,n);return n;}
function instanceBy(id,parent){throw new Error('Use await getNodeByIdAsync before instancing');}
async function effect(n,name){await n.setEffectStyleIdAsync(STATE.styles.effect[name]);}
async function paint(n,name){await n.setFillStyleIdAsync(STATE.styles.paint[name]);}
let componentY=80;
function variants(name,items,cols=5,description='') {const cs=record(figma.combineAsVariants(items,page));cs.name=name;cs.description=description;let rowY=32,rowH=0,x=32;const cw=Math.max(...items.map(n=>n.width))+24;items.forEach((c,i)=>{if(i%cols===0&&i){rowY+=rowH+32;rowH=0;}c.x=32+(i%cols)*cw;c.y=rowY;rowH=Math.max(rowH,c.height);});cs.resize(Math.min(cols,items.length)*cw+40,rowY+rowH+32);cs.x=1800;cs.y=componentY;componentY+=cs.height+80;fill(cs,null);components[name]={id:cs.id,variants:Object.fromEntries(items.map(c=>[c.name,c.id]))};return cs;}
function root(name,w=1280,color='surface/card'){if(page.children.some(n=>n.name===name))throw new Error('Frame exists: '+name);const n=layout(name,'VERTICAL',32,48,color);n.resize(w,100);n.primaryAxisSizingMode='AUTO';n.counterAxisSizingMode='FIXED';n.x=80;n.y=80;roots.push(n.id);return n;}
async function heading(parent,kicker,title,detail,width=1100){const h=append(parent,layout(title,'VERTICAL',8));await text(h,kicker,'Code','accent-strong',width);await text(h,title,'Heading','text/strong',width);if(detail)await text(h,detail,'Body','text/body',width);return h;}
function idsUnder(n){return [n.id,...n.findAll(()=>true).map(c=>c.id)];}
function result(extra={}){return {createdNodeIds:[...new Set(made)],roots,components,...extra};}
