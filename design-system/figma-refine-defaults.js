// Give variant-specific text its own property, so a component-set default does not overwrite it.
const changed=[];
async function refine(family,variant,oldName,newName,value){
 const set=await figma.getNodeByIdAsync((STATE.core.components[family]||STATE.game.components[family]).id);
 const c=await figma.getNodeByIdAsync((STATE.core.components[family]||STATE.game.components[family]).variants[variant]);
 const oldKey=Object.keys(set.componentPropertyDefinitions).find(k=>k.split('#')[0]===oldName);
 const n=c.findOne(n=>n.type==='TEXT'&&n.componentPropertyReferences?.characters===oldKey);
 if(!n)throw new Error('Missing property '+family+' '+variant+' '+oldName);
 let key=Object.keys(set.componentPropertyDefinitions).find(k=>k.split('#')[0]===newName);
 if(!key)key=set.addComponentProperty(newName,'TEXT',value);
 n.componentPropertyReferences={characters:key};n.characters=value;changed.push(c.id,n.id,set.id);
}
for(const [type,value]of [['Current','2,480'],['Best','12,840'],['Gain','+120']])await refine('Score','Type='+type,'Value',type+' value',value);
for(const device of ['Desktop','Mobile'])await refine('Item slot','Device='+device+', State=Empty','Label','Empty label','빈 칸');
await refine('Augment tile','State=Empty','Level','Empty label','미획득');
for(const state of ['Default','Selected','Disabled'])await refine('Deck tile','Type=Special, State='+state,'Label','Special label','황금 블록');
for(const device of ['Desktop','Mobile'])await refine('Choice card','Device='+device+', State=New','Title','New title','신규 · 콤보 강화');
for(const [type,value]of [['Settings','설정'],['Result','게임 종료'],['Reward','새 블록 해금']])await refine('Modal','Type='+type,'Title',type+' title',value);
for(const [family,oldName]of [['Score','Value'],['Modal','Title']]){const set=await figma.getNodeByIdAsync((STATE.core.components[family]||STATE.game.components[family]).id);const key=Object.keys(set.componentPropertyDefinitions).find(k=>k.split('#')[0]===oldName);if(key)set.deleteComponentProperty(key);}
const set=await figma.getNodeByIdAsync(STATE.game.components['Piece tray'].id);set.description='Source: PieceTray.css. Desktop has three Tray slot component instances; Mobile has three compact auto-layout slots with linked Piece instances. Desktop 600×144; Mobile343×88.';changed.push(set.id);
const specimen=await figma.getNodeByIdAsync('7:245');const description=specimen.findOne(n=>n.type==='TEXT'&&n.characters.includes('NEW 문구'));if(description){description.characters=description.characters.replace('NEW 문구','신규 문구');changed.push(description.id);}
const allSets=page.findAll(n=>n.type==='COMPONENT_SET');
const overflow=[];for(const cs of allSets)for(const c of cs.children){for(const n of c.findAll(n=>'children'in n&&n.type!=='INSTANCE').concat([c])){for(const ch of n.children){if(ch.visible&&ch.opacity>0&&(ch.x<-.5||ch.y<-.5||ch.x+ch.width>n.width+.5||ch.y+ch.height>n.height+.5))overflow.push({parent:n.id,name:n.name,child:ch.id,childName:ch.name,parentSize:[n.width,n.height],bounds:[ch.x,ch.y,ch.width,ch.height]});}}}
return{mutatedNodeIds:[...new Set(changed)],componentSetCount:allSets.length,variantCount:allSets.reduce((sum,n)=>sum+n.children.length,0),overflow:overflow.slice(0,30),overflowCount:overflow.length,variables:(await figma.variables.getLocalVariablesAsync()).map(v=>({name:v.name,scopes:v.scopes,codeSyntax:v.codeSyntax,valueType:Object.values(v.valuesByMode)[0]?.type})).filter(v=>v.scopes.includes('ALL_SCOPES')||!v.codeSyntax.WEB),reviewFrame:specimen.id};
