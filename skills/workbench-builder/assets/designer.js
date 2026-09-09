/* workflow and subagent drafts belong to task card ②. No prefilled business design. */
let FLOW_DRAFT;
function loadMeta(){
  let draft=STATE.current?.dev?.flowDraft, legacy=STATE.current?.dev?.meta;
  if(!STATE.current){
    try{ draft=JSON.parse(localStorage.getItem('aidev-flow-draft')); legacy=JSON.parse(localStorage.getItem('aidev-meta-draft')); }catch(e){}
  }
  if(draft && typeof draft.workflow==='string' && typeof draft.subagent==='string'){
    FLOW_DRAFT={workflow:draft.workflow,subagent:draft.subagent,source:typeof draft.source==='string'?draft.source:'已保存的草案，尚未确认'};
  }else{
    FLOW_DRAFT={workflow:'',subagent:'',source:'尚未填写；具体内容将由 AI 根据项目需求提出。'};
    const sameExample=legacy && JSON.stringify(legacy.roles)===JSON.stringify(LEGACY_EXAMPLE.roles) && JSON.stringify(legacy.steps)===JSON.stringify(LEGACY_EXAMPLE.steps);
    if(sameExample) FLOW_DRAFT.source='已取消 v1.2 的通用示例预填；原配置仍保留在浏览器存档中。';
    else if(legacy && Array.isArray(legacy.roles) && Array.isArray(legacy.steps) && legacy.roles.every(r=>r && typeof r==='object') && legacy.steps.every(s=>s && Array.isArray(s.roles))){
      FLOW_DRAFT={
        workflow:legacy.steps.map(s=>`${s.name||s.id} (${s.id})：由 ${s.roles.join('、')} 执行；完成后 ${s.next||'结束'}；需返工时 ${s.failTo||'停下处理'}`).join('\n'),
        subagent:legacy.roles.map(r=>`${r.name||r.id} (${r.id})：${r.instructions||'【待补】'}`).join('\n'),
        source:'从 v1.2 保存的自定义配置转入，具体来源与确认状态需核实。原配置保留。'
      };
    }
  }
  document.getElementById('f-workflow').value=FLOW_DRAFT.workflow;
  document.getElementById('f-subagent').value=FLOW_DRAFT.subagent;
  document.getElementById('flowDraftSource').textContent=FLOW_DRAFT.source;
}
function saveFlowDraft(){
  FLOW_DRAFT={workflow:document.getElementById('f-workflow').value,subagent:document.getElementById('f-subagent').value,source:'你填写或修改的草案；由 AI 结合已有设计核对。'};
  if(STATE.current){
    STATE.current.dev={...(STATE.current.dev||{}),flowDraft:{...FLOW_DRAFT}};
    const i=STATE.projects.findIndex(p=>p.name===STATE.current.name);if(i>=0)STATE.projects[i]=STATE.current;
    saveState();
  }else{try{localStorage.setItem('aidev-flow-draft',JSON.stringify(FLOW_DRAFT));}catch(e){toast('浏览器保存失败，请保留草案文本');}}
  document.getElementById('flowDraftSource').textContent=FLOW_DRAFT.source;
  invalidatePreviews();
}
function metaSpec(){
  return `\n\n## workflow 与 subagent\n草案来源：${FLOW_DRAFT.source}\nworkflow 设想：${FLOW_DRAFT.workflow.trim()||'未预设。请根据项目目标、真实材料和已有设计提出步骤、衔接、分支与人工决定点。'}\nsubagent 设想：${FLOW_DRAFT.subagent.trim()||'未预设。请依据 workflow 的实际职责、依赖和独立处理需要提出分工，不固定数量或套用通用角色。'}\n先读项目与已有设计，再解释每个步骤和 subagent 的设置依据；区分用户要求、材料依据与 AI 建议。不得把未确认草案当作已确认设计。`;
}
function initMeta(){
  ['f-workflow','f-subagent'].forEach(id=>document.getElementById(id).addEventListener('input',saveFlowDraft));
}
