// Append after figma-helpers.js. STATE is the saved figma-state.json object.
// Creates only native Figma components, instances, text and auto-layout frames.
if (!STATE.core?.components || !STATE.core?.icons) throw new Error('STATE.core is required before game components.');
const gameSetNames=['Tray slot','Piece tray','Item slot','Augment tile','Choice card','Deck tile','Board','Modal'];
if(page.children.some(n=>gameSetNames.includes(n.name)))throw new Error('Game component set already exists; inspect ledger before rerun.');
componentY=STATE.core.lastComponentY;
const coreMasters={},nativeIcons={};
for(const [name,entry]of Object.entries(STATE.core.components)){
  coreMasters[name]={};
  for(const [variant,id]of Object.entries(entry.variants)){
    const n=await figma.getNodeByIdAsync(id);
    if(!n||n.type!=='COMPONENT')throw new Error('Missing core master '+name+' / '+variant);
    coreMasters[name][variant]=n;
  }
}
for(const [name,id]of Object.entries(STATE.core.icons))nativeIcons[name]=await figma.getNodeByIdAsync(id);
function master(set,key){const n=coreMasters[set]?.[key];if(!n)throw new Error('Unknown master '+set+' / '+key);return n;}
function nativeIcon(parent,name,size=24,editable=false){
  const base=nativeIcons[name];if(!base)throw new Error('Missing icon '+name);
  const n=instance(base,parent);if(size!==n.width)n.rescale(size/n.width);
  if(editable){const k=parent.addComponentProperty('Icon','INSTANCE_SWAP',base.id);n.componentPropertyReferences={mainComponent:k};}
  return n;
}
function resizeInstance(n,w,h){n.resize(w,h);n.layoutSizingHorizontal='FIXED';n.layoutSizingVertical='FIXED';return n;}
function fixedFrame(parent,name,w,h,color,dir='VERTICAL',gap=8,pad=0){
  const n=append(parent,layout(name,dir,gap,pad,color));n.resize(w,h);n.primaryAxisSizingMode='FIXED';n.counterAxisSizingMode='FIXED';n.primaryAxisAlignItems='CENTER';n.counterAxisAlignItems='CENTER';return n;
}
function insetFocus(n){stroke(n,'text/on-board',3);n.strokeAlign='INSIDE';}
function setInstanceText(n,label){const key=Object.keys(n.componentProperties).find(k=>k.split('#')[0]==='Label');if(key)n.setProperties({[key]:label});}
function action(parent,label,secondary=false,iconName='Play'){
  const n=instance(master('Button','Size=Medium, Style='+(secondary?'Secondary':'Primary')+', State=Default'),parent);
  setInstanceText(n,label);
  const ik=Object.keys(n.componentProperties).find(k=>k.split('#')[0]==='Icon');if(ik&&nativeIcons[iconName])n.setProperties({[ik]:nativeIcons[iconName].id});
  else{const visible=Object.keys(n.componentProperties).find(k=>k.split('#')[0]==='Show icon');if(visible)n.setProperties({[visible]:false});}
  return n;
}
async function editableText(c,parent,value,role,color,width,name){const t=await text(parent,value,role,color,width);if(name)prop(c,t,name,value);return t;}
function pieceInstance(parent,shape='T',scale=1){const n=instance(master('Piece','Shape='+shape),parent);if(scale!==1)n.rescale(scale);return n;}

const slots=[],slotBy={};
for(const state of ['Default','Selected','Empty','Focus','Disabled']){
  const c=component('State='+state,124,124,'tray/slot','HORIZONTAL',0,12);
  if(state==='Empty'){fill(c,'tray/slot-empty');const t=await text(c,'사용 완료','Caption','modal/text-body',96);t.textAlignHorizontal='CENTER';}
  else{const p=pieceInstance(c,'T');const k=c.addComponentProperty('Piece','INSTANCE_SWAP',master('Piece','Shape=T').id);p.componentPropertyReferences={mainComponent:k};}
  if(state==='Selected'){fill(c,'tray/slot-hover');stroke(c,'text/on-board',2);c.strokeAlign='INSIDE';}
  if(state==='Focus')insetFocus(c);
  if(state==='Disabled')c.opacity=.45;
  slots.push(c);slotBy[state]=c;
}
variants('Tray slot',slots,5,'Source: PieceTray.css / PiecePreview.tsx. Desktop 124px slot; selected white inset ring and keyboard focus. Empty label and explicit disabled treatment are Figma documentation refinements. Nested Piece is swappable.');

const trays=[];
for(const viewport of ['Desktop','Mobile']){
  const mobile=viewport==='Mobile',w=mobile?343:600,pad=mobile?6:10,gap=mobile?6:10,h=mobile?88:144;
  const c=component('Device='+viewport,w,h,'tray/slot','HORIZONTAL',gap,pad);radius(c,'radius/lg');stroke(c,'tray/slot-border');
  const sw=(w-pad*2-gap*2)/3;
  for(const [i,shape]of ['T','O','L'].entries()){
    if(mobile){const n=fixedFrame(c,'Mobile slot '+(i+1),sw,76,'tray/slot','HORIZONTAL',0,4);radius(n);if(i===0){fill(n,'tray/slot-hover');stroke(n,'text/on-board',2);}pieceInstance(n,shape,.6);}
    else{const n=resizeInstance(instance(slotBy[i===0?'Selected':'Default'],c),sw,124);const k=Object.keys(n.componentProperties).find(key=>key.split('#')[0]==='Piece');if(k)n.setProperties({[k]:master('Piece','Shape='+shape).id});}
  }
  await effect(c,'shadow-sm');trays.push(c);
}
variants('Piece tray',trays,2,'Source: PieceTray.css. Three native Tray slot instances; Desktop 600×144 with 10px gap/padding, Mobile 343×88 with 6px gap/padding and 76px slots. Mobile piece preview scales to fit.');

const itemSlots=[];
for(const viewport of ['Desktop','Mobile'])for(const state of ['Available','Active','Empty','Unavailable','Disabled']){
  const mobile=viewport==='Mobile',empty=state==='Empty';
  const c=component('Device='+viewport+', State='+state,mobile?103:112,mobile?48:132,empty?'panel/slot-empty':state==='Active'?'panel/slot-hover':'panel/slot',mobile?'HORIZONTAL':'VERTICAL',mobile?5:8,mobile?5:12);
  radius(c,mobile?'radius/sm':'radius/md');stroke(c,state==='Active'?'text/on-board':'panel/dark-border',state==='Active'?2:1);
  if(empty){c.dashPattern=[4,3];const t=await editableText(c,c,'빈 칸','Caption','modal/text-body',undefined,'Label');t.textAlignHorizontal='CENTER';}
  else{
    if(mobile)nativeIcon(c,'Undo2',22,true);
    else{const well=fixedFrame(c,'Icon surface',64,64,'accent-strong');radius(well,'radius/sm');const i=nativeIcon(well,'Undo2',34);const k=c.addComponentProperty('Icon','INSTANCE_SWAP',nativeIcons.Undo2.id);i.componentPropertyReferences={mainComponent:k};if(state==='Unavailable')i.opacity=.55;}
    await editableText(c,c,'되돌리기',mobile?'Caption':'Small','text/on-board',undefined,'Label');
  }
  if(state==='Unavailable'&&mobile)c.children[0].opacity=.55;
  if(state==='Disabled')c.opacity=.45;
  itemSlots.push(c);
}
variants('Item slot',itemSlots,5,'Source: ItemSlots.css. Desktop 112×132, Mobile compact 48px row. Icon swap and Label property. Available/Active/Empty/Unavailable/Disabled states. Figma refinement: icon surface uses accent-strong for white-icon contrast; Active gains a white outline.');

const augmentTiles=[];
for(const state of ['Default','Active','Empty']){
  const c=component('State='+state,68,90,null,'VERTICAL',4,0);
  const well=fixedFrame(c,'Icon surface',68,68,state==='Empty'?'tray/slot-empty':'accent-strong');radius(well,'radius/lg');
  if(state==='Empty'){stroke(well,'tray/slot-border');well.dashPattern=[4,3];await text(well,'+','Title','modal/text-body');}
  else{const icon=nativeIcon(well,'Zap',35);const k=c.addComponentProperty('Icon','INSTANCE_SWAP',nativeIcons.Zap.id);icon.componentPropertyReferences={mainComponent:k};}
  if(state==='Active')insetFocus(well);
  await editableText(c,c,state==='Empty'?'미획득':'Lv.3','Caption','text/on-board',undefined,'Level');
  augmentTiles.push(c);
}
variants('Augment tile',augmentTiles,3,'Source: AugmentPanel.css. 68px icon tile plus editable level. Active native outline. Empty documents the unowned state. Figma refinement: accent-strong icon surface; label stays below the tile to avoid overlap.');

const choices=[];
for(const viewport of ['Desktop','Mobile'])for(const state of ['Default','New','Hover','Focus']){
  const mobile=viewport==='Mobile';
  const c=component('Device='+viewport+', State='+state,mobile?360:224,mobile?140:398,'modal/surface',mobile?'HORIZONTAL':'VERTICAL',mobile?12:14,mobile?12:22);
  radius(c,mobile?'radius/lg':'radius/xl');stroke(c,state==='New'?'score/gold':state==='Hover'||state==='Focus'?'text/on-board':'modal/border',state==='Default'?1:2);
  if(state==='Focus')insetFocus(c);
  const iconWell=fixedFrame(c,'Icon surface',mobile?56:104,mobile?56:104,'accent-strong');radius(iconWell,mobile?'radius/md':'radius/lg');
  const ico=nativeIcon(iconWell,'Zap',mobile?30:48);const ik=c.addComponentProperty('Icon','INSTANCE_SWAP',nativeIcons.Zap.id);ico.componentPropertyReferences={mainComponent:ik};
  const copy=append(c,layout('Card content','VERTICAL',mobile?4:12));copy.counterAxisAlignItems=mobile?'MIN':'CENTER';
  const cw=mobile?268:180;
  const tag=instance(master('Category badge','Category=combo'),copy);tag.resize(100,mobile?22:24);
  const title=await editableText(c,copy,state==='New'?'새로운 콤보 강화':'콤보 강화',mobile?'Button':'Title','modal/text',cw,'Title');
  const body=await editableText(c,copy,'콤보를 이어갈수록 추가 점수를 얻어요.','Small','modal/text-body',cw,'Description');
  const effectText=await editableText(c,copy,'콤보 점수 +5','Caption','modal/text-body',cw,'Effect');
  if(!mobile){title.textAlignHorizontal='CENTER';body.textAlignHorizontal='CENTER';effectText.textAlignHorizontal='CENTER';}
  if(state==='New'&&!mobile)await editableText(c,copy,'신규','Caption','score/gold',undefined,'Badge');
  await effect(c,'modal-shadow-md');choices.push(c);
}
variants('Choice card',choices,4,'Source: AugmentChoiceModal.css / SpecialChoiceModal.tsx. Desktop portrait 224×398, Mobile 360×140. Default/New/Hover/Focus. Editable title, description and effect; swappable native icon. Contrast refinement: modal/text-body replaces muted body and accent-strong replaces the light icon gradient.');

const deckTiles=[];
for(const kind of ['Normal','Special'])for(const state of ['Default','Selected','Disabled']){
  const c=component('Type='+kind+', State='+state,104,120,'modal/surface','VERTICAL',6,8);radius(c,'radius/md');
  if(kind==='Normal')pieceInstance(c,'L',.72);else instance(master('Block','Kind=golden'),c);
  await editableText(c,c,kind==='Normal'?'L 블록':'황금 블록','Caption','modal/text-body',undefined,'Label');
  stroke(c,state==='Selected'?'text/on-board':kind==='Special'?'score/gold':'modal/border',state==='Selected'?2:1);
  if(state==='Selected'){const mark=await text(c,'선택됨','Caption','modal/text');mark.name='Selection text';}
  if(state==='Disabled')c.opacity=.45;
  deckTiles.push(c);
}
variants('Deck tile',deckTiles,3,'Source: DeckModal.css / StartDeckModal.tsx. Normal/Special × Default/Selected/Disabled. Native Piece or special Block instance with editable label. Selection includes text as a non-color cue.');

const boards=[];
const occupied={ '0,0':'cyan','0,1':'cyan','1,0':'cyan','1,1':'cyan','2,5':'violet','3,5':'violet','4,5':'violet','4,6':'violet','5,0':'lime','5,1':'lime','5,2':'lime','6,2':'lime','7,0':'amber','7,1':'amber','7,2':'amber','7,3':'amber','7,4':'rose','7,5':'rose' };
for(const viewport of ['Desktop','Mobile'])for(const state of ['Empty','Playing','Preview']){
  const mobile=viewport==='Mobile',w=mobile?343:392,gap=mobile?2:3,pad=mobile?7:10,side=(w-pad*2-gap*7)/8;
  const c=component('Device='+viewport+', State='+state,w,w,'board/bg','VERTICAL',gap,pad);radius(c,'radius/lg');stroke(c,'board/cell-line');
  for(let r=0;r<8;r++){
    const row=append(c,layout('Row '+(r+1),'HORIZONTAL',gap,0));
    for(let col=0;col<8;col++){
      const tone=state==='Empty'?undefined:occupied[r+','+col];
      const preview=state==='Preview'&&r===7&&col>=6;
      const cell=instance(tone?master('Block','Kind='+tone):master('Board cell','State='+(preview?'Preview':'Empty')),row);cell.rescale(side/44);cell.name='Cell '+(r+1)+','+(col+1);
      for(const p of ['topLeftRadius','topRightRadius','bottomLeftRadius','bottomRightRadius'])cell.setBoundVariable(p,null);cell.cornerRadius=side*.16;
    }
  }
  await effect(c,'shadow-lg');boards.push(c);
}
variants('Board',boards,3,'Source: Board.tsx / Board.css. Native 8×8 cell instances inside eight row auto layouts. Desktop 392px: gap3/pad10; Mobile 343px: gap2/pad7. Cells use actual 16% radius at each size. Playing and Preview are illustrative fixed fixtures, not game-state logic.');

const modals=[];
for(const type of ['Settings','Result','Reward']){
  const c=component('Type='+type,340,type==='Result'?496:type==='Reward'?440:396,'modal/bg','VERTICAL',18,24);radius(c,'radius/xl');stroke(c,'modal/border');
  const title=await editableText(c,c,type==='Settings'?'설정':type==='Result'?'게임 종료':'새 블록 해금','Heading','modal/text',292,'Title');title.textAlignHorizontal='CENTER';
  if(type==='Settings'){
    nativeIcon(c,'Settings',40);
    const a=action(c,'홈으로',false,'Home');resizeInstance(a,292,48);
    const b=action(c,'그만하기',true,'LogOut');resizeInstance(b,292,48);
  }else if(type==='Result'){
    await editableText(c,c,'이번 점수','Small','modal/text-body',undefined,'Score label');
    await editableText(c,c,'2,480','Score','modal/text',undefined,'Score');
    await editableText(c,c,'최고 기록 12,840','Small','score/gold',undefined,'Best score');
    const a=action(c,'다시 도전',false,'Undo2');resizeInstance(a,292,48);
    const b=action(c,'홈으로',true,'Home');resizeInstance(b,292,48);
  }else{
    const well=fixedFrame(c,'Block reward',104,104,'modal/surface-soft');radius(well,'radius/lg');instance(master('Block','Kind=golden'),well);
    const body=await editableText(c,c,'황금 블록이 덱에 추가되었어요.','Body','modal/text-body',292,'Description');body.textAlignHorizontal='CENTER';
    const a=action(c,'계속하기',false,'Play');resizeInstance(a,292,48);
  }
  await effect(c,'modal-shadow-lg');modals.push(c);
}
variants('Modal',modals,3,'Settings / Result / Reward. Native Button, Icon and Block instances. Sources: GameSettingsMenu.tsx, GameOver.tsx, BlockRewardModal.tsx. Figma refinement: Result is a reusable dark dialog surface; production currently uses a light full-screen overlay. Backdrop and focus trapping belong to the consuming pattern.');
return result({counts:{sets:Object.keys(components).length,variants:Object.values(components).reduce((sum,set)=>sum+Object.keys(set.variants).length,0)},lastComponentY:componentY});
