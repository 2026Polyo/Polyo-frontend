// Run through use_figma after figma-helpers.js. STATE, TARGET_PAGE and PHASE
// are injected by the caller. Existing helpers provide token-bound layout,
// text, component, instance, and variant construction.
const roomComponents = {};
const roomRoots = {};
const roomMutated = [];
function add(parent, node, w) {
  append(parent, node);
  if (w !== undefined) { node.resize(w, node.height); node.layoutSizingHorizontal = 'FIXED'; }
  return node;
}
function box(parent, name, direction, w, gap = 16, pad = 0, color = null) {
  return add(parent, layout(name, direction, gap, pad, color), w);
}
function fixed(node, w, h) {
  node.resize(w, h); node.primaryAxisSizingMode = 'FIXED'; node.counterAxisSizingMode = 'FIXED';
  return node;
}
async function label(parent, value, role = 'Small', color = 'modal/text', w) {
  const node = await text(parent, value, role, color, w);
  return node;
}
function setTextProperty(componentNode, node, name, value) { return prop(componentNode, node, name, value); }
function props(instanceNode, values) {
  const keys = Object.keys(instanceNode.componentProperties);
  const mapped = {};
  for (const [name, value] of Object.entries(values)) {
    const key = keys.find(k => k === name || k.startsWith(name + '#'));
    if (!key) throw new Error('Missing property ' + name + ' on ' + instanceNode.name);
    mapped[key] = value;
  }
  instanceNode.setProperties(mapped);
}
async function button(parent, kind, value, width, disabled = false) {
  const id = disabled ? '3:90' : kind === 'primary' ? '3:74' : '3:94';
  const source = await figma.getNodeByIdAsync(id);
  const inst = instance(source, parent);
  props(inst, {Label: value, 'Show icon': kind === 'primary' && !disabled});
  if (kind === 'primary' && !disabled) props(inst, {Icon: '3:50'});
  inst.resize(width, 52);
  inst.layoutSizingHorizontal = 'FIXED'; inst.layoutSizingVertical = 'FIXED';
  return inst;
}
async function icon(parent, id, size = 24) {
  const source = await figma.getNodeByIdAsync(id);
  const inst = instance(source, parent);
  if (size !== inst.width) inst.rescale(size / inst.width);
  return inst;
}

if (PHASE === 'shell') {
  if (page.children.some(n => n.name === 'Matchroom · Create room')) throw new Error('Review frame already exists; use its recorded ID.');
  const maxX = Math.max(0, ...page.children.map(n => n.x + n.width));
  const review = layout('Matchroom · Create room', 'VERTICAL', 32, 48, 'surface/card');
  review.resize(2048, 100); review.primaryAxisSizingMode = 'AUTO'; review.counterAxisSizingMode = 'FIXED';
  review.x = maxX + 200; review.y = 80; roots.push(review.id);
  radius(review, 'radius/xl');
  return result({reviewFrame: review.id, bounds: {x: review.x, y: review.y, width: review.width, height: review.height}});
}

if (PHASE === 'components') {
  const maxRight = Math.max(0, ...page.children.map(n => n.x + n.width));
  const fields = [];
  for (const state of ['Empty', 'Filled', 'Focus', 'Error', 'Disabled']) {
    const c = component('State=' + state, 520, 106, null, 'VERTICAL', 8, 0);
    c.primaryAxisSizingMode = 'AUTO'; c.counterAxisAlignItems = 'MIN';
    const head = box(c, 'Label row', 'HORIZONTAL', 520, 8);
    fixed(head, 520, 22); head.primaryAxisAlignItems = 'SPACE_BETWEEN'; head.counterAxisAlignItems = 'CENTER';
    const title = await label(head, '방 이름', 'Button');
    const count = await label(head, '0/20', 'Caption', 'modal/text-muted');
    const input = box(c, 'Input', 'HORIZONTAL', 520, 12, 16, 'modal/surface');
    fixed(input, 520, 52); input.counterAxisAlignItems = 'CENTER'; radius(input, 'radius/md');
    stroke(input, state === 'Error' ? 'piece/rose' : state === 'Focus' ? 'blue/100' : 'modal/border', state === 'Focus' || state === 'Error' ? 2 : 1);
    const valueText = await label(input, state === 'Empty' ? '예: 가볍게 한 판!' : '같이 블록 맞춰요!', 'Body', state === 'Empty' ? 'modal/text-muted' : 'modal/text', 488);
    const hint = await label(c, state === 'Error' ? '방 이름은 2~20자로 입력해 주세요.' : '2~20자 · 친구들이 알아볼 수 있는 이름을 지어주세요.', 'Caption', state === 'Error' ? 'modal/text' : 'modal/text-muted', 520);
    for (const row of [head, input, hint]) row.layoutSizingHorizontal = 'FILL';
    valueText.layoutSizingHorizontal = 'FILL';
    setTextProperty(c, title, 'Label', '방 이름'); setTextProperty(c, count, 'Count', '0/20');
    setTextProperty(c, valueText, 'Value', state === 'Empty' ? '예: 가볍게 한 판!' : '같이 블록 맞춰요!');
    setTextProperty(c, hint, 'Hint', state === 'Error' ? '방 이름은 2~20자로 입력해 주세요.' : '2~20자 · 친구들이 알아볼 수 있는 이름을 지어주세요.');
    if (state === 'Disabled') c.opacity = 0.55;
    fields.push(c);
  }
  const fieldSet = variants('Room/Text field', fields, 2, '방 만들기의 이름·비밀번호 입력. Label, Value, Count, Hint를 인스턴스에서 편집합니다. Empty/Filled/Focus/Error/Disabled 상태를 제공합니다.');
  fieldSet.x = maxRight + 160; fieldSet.y = 80;
  roomComponents.textField = {id: fieldSet.id, variants: Object.fromEntries(fields.map(c => [c.name.slice(6), c.id]))};
  const options = [];
  for (const selected of [false, true]) {
    const c = component('State=' + (selected ? 'Selected' : 'Default'), 252, 80, selected ? 'surface/card-soft' : 'modal/surface', 'HORIZONTAL', 12, 16);
    c.primaryAxisAlignItems = 'MIN'; stroke(c, selected ? 'blue/100' : 'modal/border', selected ? 2 : 1);
    const content = box(c, 'Copy', 'VERTICAL', 180, 4);
    const title = await label(content, '공개', 'Button', selected ? 'text/strong' : 'modal/text');
    const detail = await label(content, '누구나 참여할 수 있어요', 'Caption', selected ? 'text/body' : 'modal/text-body', 180);
    const marker = await icon(c, '3:53', 20); marker.visible = selected;
    content.layoutSizingHorizontal = 'FILL';
    for (const t of [title, detail]) {t.textAutoResize = 'HEIGHT'; t.resize(180, t.height); t.layoutSizingHorizontal = 'FILL';}
    for (const v of marker.findAllWithCriteria({types: ['VECTOR']})) if (v.strokes.length) v.strokes = [solid('accent-strong')];
    setTextProperty(c, title, 'Label', '공개'); setTextProperty(c, detail, 'Detail', '누구나 참여할 수 있어요');
    const showDetail = c.addComponentProperty('Show detail', 'BOOLEAN', true);
    detail.componentPropertyReferences = {...detail.componentPropertyReferences, visible: showDetail};
    options.push(c);
  }
  const optionSet = variants('Room/Option', options, 2, '방 인원과 공개 범위 선택에 사용하는 단일 선택 항목. Selected/Default 상태, Label·Detail·Show detail 속성을 제공합니다.');
  optionSet.x = maxRight + 160; optionSet.y = fieldSet.y + fieldSet.height + 100;
  roomComponents.option = {id: optionSet.id, variants: Object.fromEntries(options.map(c => [c.name.slice(6), c.id]))};
  for (const set of [fieldSet, optionSet]) made.push(...set.findAll(() => true).map(n => n.id));
  return result({roomComponents, variantCount: fields.length + options.length, componentSets: [{id: fieldSet.id, name: fieldSet.name, width: fieldSet.width, height: fieldSet.height}, {id: optionSet.id, name: optionSet.name, width: optionSet.width, height: optionSet.height}]});
}

if (PHASE === 'fix-components') {
  const sets = await Promise.all(Object.values(STATE.matchroom.roomComponents).map(c => figma.getNodeByIdAsync(c.id)));
  for (const set of sets) {
    for (const c of set.children) {
      const frames = c.findAllWithCriteria({types: ['FRAME']});
      for (const f of frames.filter(n => ['Label row', 'Input', 'Copy'].includes(n.name))) {f.layoutSizingHorizontal = 'FILL'; roomMutated.push(f.id);}
      for (const t of c.findAllWithCriteria({types: ['TEXT']})) {
        const ref = t.componentPropertyReferences.characters || '';
        if (ref.startsWith('Value#') || ref.startsWith('Hint#') || set.name === 'Room/Option') {
          t.textAutoResize = 'HEIGHT'; t.resize(t.width, Math.max(18, t.height)); t.layoutSizingHorizontal = 'FILL'; roomMutated.push(t.id);
        }
      }
      if (set.name === 'Room/Option') {
        for (const v of c.findAllWithCriteria({types: ['VECTOR']})) if (v.strokes.length) {v.strokes = [solid('accent-strong')]; roomMutated.push(v.id);}
      }
    }
  }
  return {mutatedNodeIds: roomMutated, fixes: ['Fluid form fields', 'Fluid option copy', 'Visible selection checkmarks']};
}

if (PHASE === 'fix-instances') {
  const review = await figma.getNodeByIdAsync(STATE.matchroom.reviewFrame);
  const familyIds = new Set(Object.values(STATE.matchroom.roomComponents).map(c => c.id));
  const instances = review.findAllWithCriteria({types: ['INSTANCE']});
  const sources = await Promise.all(instances.map(n => n.getMainComponentAsync()));
  for (let i = 0; i < instances.length; i++) {
    const inst = instances[i], source = sources[i];
    if (!source || !familyIds.has(source.parent.id)) continue;
    const saved = Object.fromEntries(Object.entries(inst.componentProperties).map(([k, v]) => [k, v.value]));
    const width = inst.width, height = inst.height;
    inst.removeOverrides(); inst.setProperties(saved); inst.resize(width, height);
    inst.layoutSizingHorizontal = 'FIXED'; inst.layoutSizingVertical = 'FIXED';
    roomMutated.push(inst.id, ...inst.findAll(() => true).map(n => n.id));
  }
  return {mutatedNodeIds: [...new Set(roomMutated)], fixedInstanceCount: roomMutated.filter(id => instances.some(n => n.id === id)).length};
}

if (PHASE === 'compose') {
  const review = await figma.getNodeByIdAsync(STATE.matchroom.reviewFrame);
  if (review.children.length) throw new Error('Review frame has content; inspect before composing again.');
  roomMutated.push(review.id);
  const fieldSources = {}, optionSources = {};
  await Promise.all(Object.entries(STATE.matchroom.roomComponents.textField.variants).map(async ([k, id]) => {fieldSources[k] = await figma.getNodeByIdAsync(id);}));
  await Promise.all(Object.entries(STATE.matchroom.roomComponents.option.variants).map(async ([k, id]) => {optionSources[k] = await figma.getNodeByIdAsync(id);}));
  async function field(parent, width, config) {
    const inst = instance(fieldSources[config.state || 'Filled'], parent);
    props(inst, {Label: config.label || '방 이름', Count: config.count || '', Value: config.value, Hint: config.hint});
    inst.resize(width, inst.height); inst.layoutSizingHorizontal = 'FIXED';
    return inst;
  }
  async function option(parent, width, title, selected, detail = '') {
    const inst = instance(optionSources[selected ? 'Selected' : 'Default'], parent);
    props(inst, {Label: title, Detail: detail, 'Show detail': Boolean(detail)});
    inst.resize(width, detail ? 84 : 52); inst.layoutSizingHorizontal = 'FIXED'; inst.layoutSizingVertical = 'FIXED';
    return inst;
  }
  async function groupTitle(parent, value, meta, width) {
    const row = box(parent, value + ' label', 'HORIZONTAL', width, 8); row.primaryAxisAlignItems = 'SPACE_BETWEEN';
    fixed(row, width, 24); row.counterAxisAlignItems = 'CENTER';
    await label(row, value, 'Button'); if (meta) await label(row, meta, 'Caption', 'modal/text-muted');
    return row;
  }
  async function brand(parent, mobile) {
    const row = box(parent, 'Brand', 'HORIZONTAL', mobile ? 342 : 1328, 12);
    fixed(row, mobile ? 342 : 1328, 44); row.counterAxisAlignItems = 'CENTER'; row.primaryAxisAlignItems = 'SPACE_BETWEEN';
    const word = await label(row, 'POLYOMINO', 'Display', 'text/on-board'); word.fontSize = mobile ? 22 : 26; word.lineHeight = {unit: 'PIXELS', value: 32};
    const mark = box(row, 'Multiplayer badge', 'HORIZONTAL', undefined, 8, 8, 'board/bg'); radius(mark, 'radius/pill');
    await label(mark, 'MULTIPLAYER', 'Code', 'modal/text');
  }
  async function form(parent, width, mobile, privateRoom) {
    const contentWidth = width - (mobile ? 48 : 80);
    const panel = box(parent, 'Create room form', 'VERTICAL', width, 24, mobile ? 24 : 40, 'modal/bg');
    panel.counterAxisAlignItems = 'MIN'; panel.clipsContent = false;
    const header = box(panel, 'Form heading', 'HORIZONTAL', contentWidth, 16); header.primaryAxisAlignItems = 'SPACE_BETWEEN'; header.counterAxisAlignItems = 'MIN';
    const title = box(header, 'Title and intro', 'VERTICAL', contentWidth - 56, 8);
    await label(title, '방 만들기', 'Heading');
    await label(title, mobile ? '친구들과 함께할 방을 만들어 보세요.' : '함께할 사람들을 위한 공간을 만들어 보세요.', 'Small', 'modal/text-body', contentWidth - 56);
    const closeSource = await figma.getNodeByIdAsync('3:155'); const close = instance(closeSource, header); props(close, {Icon: '3:25'}); close.resize(40, 40);
    const divider = rect(panel, 'Divider', contentWidth, 1, 'modal/border');
    const name = privateRoom ? '친구끼리 한 판!' : '같이 블록 맞춰요!';
    await field(panel, contentWidth, {value: name, count: name.length + '/20', hint: mobile ? '2~20자로 입력해 주세요.' : '2~20자 · 친구들이 알아볼 수 있는 이름을 지어주세요.'});
    const capacity = box(panel, 'Capacity', 'VERTICAL', contentWidth, 12);
    await groupTitle(capacity, '최대 인원', '방장 포함', contentWidth);
    const capacityRow = box(capacity, 'Capacity options', 'HORIZONTAL', contentWidth, 8);
    for (const n of [2, 3, 4]) await option(capacityRow, (contentWidth - 16) / 3, n + '명', n === 4);
    const visibility = box(panel, 'Visibility', 'VERTICAL', contentWidth, 12);
    await groupTitle(visibility, '공개 설정', '', contentWidth);
    const visibilityRow = box(visibility, 'Visibility options', 'HORIZONTAL', contentWidth, 12);
    await option(visibilityRow, (contentWidth - 12) / 2, '공개', !privateRoom, mobile ? '누구나 참여' : '누구나 참여할 수 있어요');
    await option(visibilityRow, (contentWidth - 12) / 2, '비공개', privateRoom, mobile ? '비밀번호 필요' : '비밀번호로 참여해요');
    if (privateRoom) {
      await field(panel, contentWidth, {label: '비밀번호', value: '••••••', count: '', hint: '숫자 4~8자리로 설정해 주세요.'});
    } else {
      const info = box(panel, 'Public room hint', 'HORIZONTAL', contentWidth, 8);
      await icon(info, '3:9', 20); await label(info, '공개 방은 다른 사람도 참여할 수 있어요.', 'Small', 'modal/text-body', contentWidth - 28);
    }
    const footer = box(panel, 'Actions', 'HORIZONTAL', contentWidth, 12);
    await button(footer, 'secondary', '취소', mobile ? 90 : 120);
    const createButton = await button(footer, 'primary', '방 만들기', contentWidth - (mobile ? 102 : 132));
    return {panel, createButton, close, divider};
  }
  await heading(review, '04 / MATCHROOM', '함께할 방을 만드는 첫 단계', '방 만들기 · 데스크톱과 모바일 · 입력 및 생성 상태', 1952);
  const screens = box(review, 'Create room screens', 'HORIZONTAL', 1952, 48); screens.counterAxisAlignItems = 'MIN';
  const desktop = box(screens, 'Create room · Desktop / 1440', 'VERTICAL', 1440, 40, 40);
  fixed(desktop, 1440, 1080); desktop.counterAxisAlignItems = 'CENTER'; radius(desktop, 'radius/xl'); await paint(desktop, 'Page gradient');
  await brand(desktop, false);
  const card = box(desktop, 'Room creation card', 'HORIZONTAL', 1120, 0); card.counterAxisAlignItems = 'MIN'; radius(card, 'radius/xl'); card.clipsContent = true; await effect(card, 'modal-shadow-lg');
  const aside = box(card, 'Invitation panel', 'VERTICAL', 440, 28, 40, 'board/bg');
  fixed(aside, 440, 782); aside.primaryAxisAlignItems = 'CENTER'; aside.counterAxisAlignItems = 'MIN';
  await label(aside, 'PLAY TOGETHER', 'Code', 'blue/100');
  const intro = await label(aside, '같이할 준비,\n방 하나면 끝.', 'Heading', 'modal/text', 360); intro.fontSize = 36; intro.lineHeight = {unit: 'PIXELS', value: 50};
  await label(aside, '방을 만들고,\n친구들을 초대해 보세요.', 'Body', 'modal/text-body', 360);
  const art = box(aside, 'Brand blocks', 'VERTICAL', undefined, 6, 16, 'modal/surface'); radius(art, 'radius/lg');
  const blockIds = ['3:172', '3:173', '3:174', '3:175', '3:176', '3:177', '3:178', '3:179', '3:180'];
  for (let r = 0; r < 3; r++) {const row = box(art, 'Brand block row', 'HORIZONTAL', undefined, 6); for (let c = 0; c < 3; c++) await icon(row, blockIds[r * 3 + c], 48);}
  const note = box(aside, 'Private room tip', 'HORIZONTAL', 360, 12); await icon(note, '3:57', 20); await label(note, '친구끼리 모일 땐\n비공개 방을 선택해 보세요.', 'Small', 'modal/text-body', 328);
  const desktopForm = await form(card, 680, false, false);
  aside.resize(440, desktopForm.panel.height);
  await label(desktop, '설정을 확인한 뒤 방 만들기를 눌러주세요.', 'Small', 'text/on-board');
  const mobile = box(screens, 'Create room · Mobile / 390', 'VERTICAL', 390, 24, 24);
  fixed(mobile, 390, 1120); mobile.counterAxisAlignItems = 'CENTER'; radius(mobile, 'radius/xl'); await paint(mobile, 'Page gradient');
  await brand(mobile, true);
  const mobileForm = await form(mobile, 342, true, true); radius(mobileForm.panel, 'radius/xl'); await effect(mobileForm.panel, 'modal-shadow-md');
  await label(mobile, '설정을 확인한 뒤 방 만들기를 눌러주세요.', 'Caption', 'text/on-board', 342);
  await heading(review, 'FORM STATES', '입력부터 생성까지, 막히지 않게', '필수 입력 안내 · 비밀번호 형식 · 생성 중 잠금 · 실패 후 재시도', 1952);
  const states = box(review, 'Create room states', 'HORIZONTAL', 1952, 24); states.counterAxisAlignItems = 'MIN';
  const cards = [];
  for (const [index, titleText, description] of [[0, '방 이름 확인', '필수 입력과 길이 제한'], [1, '비밀번호 확인', '비공개 방에서만 필수'], [2, '방 만드는 중', '완료될 때까지 입력 잠금'], [3, '잠시 연결이 끊겼어요', '작성한 설정을 유지하고 재시도']]) {
    const card = box(states, 'State / ' + index, 'VERTICAL', 470, 20, 24, 'modal/bg'); radius(card, 'radius/lg');
    fixed(card, 470, 340); card.counterAxisAlignItems = 'MIN';
    await label(card, '0' + (index + 1) + ' / ' + titleText, 'Title');
    await label(card, description, 'Small', 'modal/text-body', 422);
    if (index === 0) {await field(card, 422, {state: 'Error', value: '가', count: '1/20', hint: '방 이름은 2~20자로 입력해 주세요.'}); await button(card, 'primary', '방 만들기', 422, true);}
    if (index === 1) {await field(card, 422, {state: 'Error', label: '비밀번호', value: '••', hint: '숫자 4~8자리로 입력해 주세요.'}); await button(card, 'primary', '방 만들기', 422, true);}
    if (index === 2) {await field(card, 422, {state: 'Disabled', value: '같이 블록 맞춰요!', hint: '방을 만들고 있어요. 잠시만 기다려 주세요.'}); await button(card, 'primary', '방 만드는 중…', 422, true);}
    if (index === 3) {const alert = box(card, 'Connection error', 'VERTICAL', 422, 8, 16, 'modal/surface'); radius(alert, 'radius/md'); stroke(alert, 'piece/rose', 2); await label(alert, '방을 만들지 못했어요.', 'Button'); await label(alert, '연결 상태를 확인하고 다시 시도해 주세요.', 'Small', 'modal/text-body', 390); await button(card, 'primary', '다시 시도', 422);}
    cards.push(card.id);
  }
  await label(review, 'Poliyomino · Create room / 화면 시안 · 인원 및 입력 제한은 구현 전 확정', 'Small', 'text/muted', 1952);
  roomRoots.desktop = desktop.id; roomRoots.mobile = mobile.id; roomRoots.states = states.id;
  const descendants = review.findAll(() => true);
  made.push(...descendants.map(n => n.id));
  const typeCounts = {}; descendants.forEach(n => {typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;});
  const imageNodes = descendants.filter(n => 'fills' in n && Array.isArray(n.fills) && n.fills.some(f => f.type === 'IMAGE')).map(n => ({id:n.id,name:n.name,type:n.type,width:n.width,height:n.height}));
  return result({mutatedNodeIds: roomMutated, reviewFrame: review.id, screenIds: roomRoots, stateCardIds: cards, bounds: {width: review.width, height: review.height}, descendantCount: descendants.length, typeCounts, imageNodes, fontFamilies: [...new Set(descendants.filter(n=>n.type === 'TEXT').flatMap(n=>n.getStyledTextSegments(['fontName']).map(s=>s.fontName.family)))], instanceCount:typeCounts.INSTANCE || 0});
}
throw new Error('Unknown PHASE: ' + PHASE);
