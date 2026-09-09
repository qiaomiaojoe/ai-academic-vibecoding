module.exports = async (page) => {
  const checks=[],errors=[];const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};
  page.on('pageerror',e=>errors.push(e.message));
  const keys=['aidev-workbench-projects','aidev-meta-draft','aidev-flow-draft'];
  const original=await page.evaluate(keys=>keys.map(k=>localStorage.getItem(k)),keys);
  const nav=key=>page.locator('.nav-item[data-p="'+key+'"]');
  try{
    await page.evaluate(()=>{
      const sample=JSON.parse(JSON.stringify(LEGACY_EXAMPLE));const edited=JSON.parse(JSON.stringify(sample));edited.roles[0].instructions='保留我定制的文献核对规则';
      localStorage.setItem('aidev-workbench-projects',JSON.stringify({current:null,projects:[{name:'新项目'},{name:'旧示例',dev:{meta:sample}},{name:'自定义',dev:{meta:edited}}]}));
      localStorage.removeItem('aidev-flow-draft');localStorage.removeItem('aidev-meta-draft');
    });
    await page.reload();
    check(await page.locator('.nav-item:not([data-p="blueprint"])').count()===4,'exactly four workflow task cards');
    check(await page.locator('#panel-meta,#panel-validate,#metaChecks').count()===0,'standalone extra cards and acceptance editor removed');
    await nav('flow').click();
    check(await page.locator('#panel-flow h2').innerText()==='② 流程设计与搭建','second card correctly named');
    check(await page.locator('#panel-flow #f-workflow').count()===1&&await page.locator('#panel-flow #f-subagent').count()===1,'workflow and subagent integrated into card two');
    check(await page.locator('#f-workflow').inputValue()===''&&await page.locator('#f-subagent').inputValue()==='','new workspace has no invented defaults');
    await nav('entry').click();await page.locator('.recent').filter({hasText:'新项目'}).click();await nav('flow').click();
    await page.locator('#f-request').fill('为任意业务设计协作机制');await page.locator('#panel-flow .btn-primary').click();let text=await page.locator('#flowPreview').innerText();
    check(text.includes('未预设')&&text.includes('解释每个步骤和 subagent 的设置依据'),'AI receives requirement-based design and provenance instructions');
    check(!text.includes('搭建完成后立即调用')&&text.includes('只做设计时不启动搭建与试跑'),'design-only mode does not execute trials');
    await page.locator('#f-workflow').fill('先读材料，再整合 <b>草案</b>');await page.locator('#f-subagent').fill('领域分析与方法检查分别执行');
    check(await page.evaluate(()=>!LAST.flow),'draft edits invalidate old prompt');
    await page.locator('#panel-flow .btn-primary').click();text=await page.locator('#flowPreview').innerText();
    check(text.includes('领域分析与方法检查分别执行')&&text.includes('<b>草案</b>')&&await page.locator('#flowPreview pre b').count()===0,'custom drafts passed literally and safely');
    await page.reload();await nav('flow').click();
    check(await page.locator('#f-workflow').inputValue()==='先读材料，再整合 <b>草案</b>','drafts survive reload');
    await page.locator('#f-mode').selectOption('build');await page.locator('#panel-flow .btn-primary').click();text=await page.locator('#flowPreview').innerText();
    check(text.includes('搭建完成后立即调用同仓库的 workbench-validator')&&text.includes('不等待我另发试跑指令'),'building automatically continues to trial repair and retest');
    check(text.includes('外部发送仍保留决定点')&&text.includes('不能用模拟结果冒充真实运行'),'automatic repair retains business decisions and truthful evidence');
    await nav('entry').click();await page.locator('.recent').filter({hasText:'旧示例'}).click();await nav('flow').click();
    check(await page.locator('#f-workflow').inputValue()===''&&await page.locator('#f-subagent').inputValue()==='','v1.2 generic template is no longer auto-filled');
    check((await page.locator('#flowDraftSource').innerText()).includes('通用示例')&&await page.evaluate(()=>STATE.current.dev.meta.roles.length===3),'legacy template provenance disclosed and original preserved');
    await nav('entry').click();await page.locator('.recent').filter({hasText:'自定义'}).click();await nav('flow').click();
    check((await page.locator('#f-subagent').inputValue()).includes('保留我定制的文献核对规则'),'custom v1.2 configuration preserved as draft');
    check((await page.locator('#flowDraftSource').innerText()).includes('具体来源与确认状态需核实'),'imported custom config is not falsely treated as confirmed');
    await nav('entry').click();await page.locator('.recent').filter({hasText:'新项目'}).click();await nav('flow').click();
    check((await page.locator('#f-subagent').inputValue())==='领域分析与方法检查分别执行','project-specific draft isolation');
    check(errors.length===0,'no JavaScript errors');return {passed:checks.length,checks};
  }finally{
    await page.evaluate(({keys,values})=>keys.forEach((k,i)=>values[i]===null?localStorage.removeItem(k):localStorage.setItem(k,values[i])),{keys,values:original});await page.reload();
  }
}
