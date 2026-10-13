const all={...STATE.core.components,...STATE.game.components};const refs={};
for(const [family,data]of Object.entries(all)){refs[family]={};for(const [name,id]of Object.entries(data.variants))refs[family][name]=await figma.getNodeByIdAsync(id);}
const icons={};for(const [name,id]of Object.entries(STATE.core.icons))icons[name]=await figma.getNodeByIdAsync(id);
function use(family,key,parent){if(!refs[family]?.[key])throw new Error('Missing '+family+' / '+key);return instance(refs[family][key],parent);}
function renameText(inst,value){const t=inst.findOne(n=>n.type==='TEXT');if(t)t.characters=value;}
async function screen(parent,name,w,h,pad=24){const n=append(parent,layout(name,'VERTICAL',16,pad));n.resize(w,h);n.primaryAxisSizingMode='FIXED';n.counterAxisSizingMode='FIXED';n.counterAxisAlignItems='CENTER';radius(n,'radius/xl');await paint(n,'Page gradient');return n;}
const overview=root('Poliyomino · Patterns',1728);
await heading(overview,'03 / PATTERNS','컴포넌트가 모여 게임이 됩니다','모든 화면은 라이브러리 인스턴스와 편집 가능한 텍스트로 구성했습니다. 점수·보드 상태는 설명용 샘플입니다.',1600);
const desktop=await screen(overview,'Play · Wide / 1632',1632,1060,32);
const top=append(desktop,layout('Top bar','HORIZONTAL',24));top.resize(1568,48);top.primaryAxisSizingMode='FIXED';top.counterAxisSizingMode='FIXED';top.primaryAxisAlignItems='SPACE_BETWEEN';const best=use('Score','Type=Best',top);best.resize(240,48);use('Icon button','State=Default',top);
use('Score','Type=Current',desktop);
const main=append(desktop,layout('Game layout','HORIZONTAL',24));main.counterAxisAlignItems='MIN';
const left=append(main,layout('Augments','VERTICAL',12,16,'modal/bg'));left.resize(220,200);left.primaryAxisSizingMode='AUTO';left.counterAxisSizingMode='FIXED';radius(left,'radius/lg');await text(left,'증강','Title','modal/text');await text(left,'이번 게임의 성장','Small','modal/text-body',188);const augRow=append(left,layout('Augment inventory','HORIZONTAL',8));for(let i=0;i<2;i++)use('Augment tile',i===0?'State=Active':'State=Default',augRow);await text(left,'다음 증강까지  120점','Caption','modal/text-body',188);
const center=append(main,layout('Board and tray','VERTICAL',22));const board=use('Board','Device=Desktop, State=Playing',center);board.rescale(600/392);use('Piece tray','Device=Desktop',center);
const right=append(main,layout('Items and deck','VERTICAL',24));const inv=append(right,layout('Item panel','VERTICAL',12,16,'panel/dark'));radius(inv,'radius/lg');await text(inv,'아이템','Title','text/on-board');for(const state of ['Available','Active','Empty'])use('Item slot','Device=Desktop, State='+state,inv);const deck=use('Button','Size=Medium, Style=Secondary, State=Default',right);renameText(deck,'덱 보기');
await text(desktop,'와이드 화면 · 1520px 초과 / 보드는 최대 600px, 증강과 아이템은 양옆에 배치','Small','text/on-board');
await heading(overview,'MOBILE / 390','손 안에서 이어지는 플레이','720px 이하에서는 아이템과 증강을 보드 위로 옮기고, 트레이 높이를 줄입니다.',1600);
const phones=append(overview,layout('Mobile patterns','HORIZONTAL',32));
const start=await screen(phones,'Start · Mobile / 390',390,844,24);start.primaryAxisAlignItems='CENTER';
const mark=append(start,layout('Logo grid','VERTICAL',5,12,'surface/card'));radius(mark,'radius/lg');for(let r=0;r<3;r++){const line=append(mark,layout('Row','HORIZONTAL',5));for(let x=0;x<4;x++){const c=use('Block','Kind='+Object.keys(SOURCE.pieces)[(r*4+x)%11],line);c.rescale(34/44);if(r===0&&x===3)c.opacity=0;}}
const title=await text(start,'POLYOMINO','Display','text/strong');title.fontSize=43;title.lineHeight={unit:'PIXELS',value:48};
const resume=use('Button','Size=Large, Style=Primary, State=Default',start);renameText(resume,'이어하기');const ng=use('Button','Size=Large, Style=Secondary, State=Default',start);renameText(ng,'새 게임');const ds=use('Button','Size=Medium, Style=Secondary, State=Default',start);renameText(ds,'덱 구성');use('Score','Type=Best',start);
const mobile=await screen(phones,'Play · Mobile / 390',390,844,22);const head=append(mobile,layout('Score and settings','HORIZONTAL',24));head.resize(342,48);head.primaryAxisSizingMode='FIXED';head.primaryAxisAlignItems='SPACE_BETWEEN';await text(head,'2,480','Score mobile','text/strong');use('Icon button','State=Default',head);
const itemrow=append(mobile,layout('Item strip','HORIZONTAL',8));for(const state of ['Available','Active','Empty'])use('Item slot','Device=Mobile, State='+state,itemrow);
const aug=append(mobile,layout('Augment summary','HORIZONTAL',12,12,'modal/bg'));aug.resize(342,54);aug.primaryAxisSizingMode='FIXED';aug.counterAxisSizingMode='FIXED';radius(aug);instance(icons.Flame,aug);await text(aug,'증강 3개 · 다음 목표 2,600','Small','modal/text');
use('Board','Device=Mobile, State=Preview',mobile);use('Piece tray','Device=Mobile',mobile);await text(mobile,'블록을 선택한 뒤 놓을 위치를 탭하세요.','Small','text/on-board',342);
const examples=append(phones,layout('Choice and modal patterns','VERTICAL',24));await text(examples,'선택 / 피드백','Title');use('Choice card','Device=Mobile, State=New',examples);use('Modal','Type=Result',examples);await text(examples,'New는 색상과 문구로 함께 표시합니다.\n모달의 제목·문구는 인스턴스에서 바꿀 수 있습니다.','Small','text/body',360);
return result({reviewFrame:overview.id,screenIds:{desktop:desktop.id,start:start.id,mobile:mobile.id},bounds:{width:overview.width,height:overview.height},instanceCount:overview.findAll(n=>n.type==='INSTANCE').length,detached:false});
