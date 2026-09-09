module.exports = async (page) => {
  const checks=[], errors=[];page.on('pageerror',e=>errors.push(e.message));
  const check=(v,name)=>{if(!v)throw Error(name);checks.push(name);};
  check((await page.locator('#mode').innerText()).includes('模拟模式'),'generated workbench clearly labels simulation');
  const previous=await page.locator('#runs').inputValue();
  await page.locator('#input').fill('测试任务：整理材料，保留 <script>literal</script>，待作者验收。');await page.locator('#create').click();
  await page.waitForFunction(old=>document.getElementById('runs').value!==old && document.getElementById('runs').value.length===36,previous);
  const id=await page.locator('#runs').inputValue();
  check(id.length===36,'generated workbench creates isolated task');
  await page.locator('#advance').click();await page.waitForFunction(()=>document.getElementById('review').hidden===false);
  check(await page.locator('#evidence article').count()===2,'both parallel role outputs visible');
  check(await page.locator('#evidence script').count()===0,'role output is rendered as text');
  await page.locator('#approve').click();await page.waitForFunction(()=>document.getElementById('error').textContent.length>0);
  check((await page.locator('#error').innerText()).includes('判断依据'),'approval without rationale is rejected');
  await page.locator('#note').fill('测试决定：材料可以继续');await page.locator('#approve').click();
  await page.waitForFunction(()=>document.querySelector('.node.active')?.textContent.includes('汇总'));
  await page.locator('#advance').click();await page.waitForFunction(()=>document.getElementById('review').hidden===false);
  check((await page.locator('#evidence').innerText()).includes('上游步骤：process'),'downstream role receives accepted upstream');
  await page.locator('#note').fill('测试决定：退回重新处理');await page.locator('#reject').click();
  await page.waitForFunction(()=>document.querySelector('.node.active')?.textContent.includes('独立'));
  check(await page.locator('.node.done').count()===0,'rejection invalidates accepted outputs');
  await page.reload();await page.locator('#runs').selectOption(id);await page.waitForFunction(()=>document.getElementById('task').hidden===false);
  check((await page.locator('#history').textContent()).includes('退回重新处理'),'task and evidence survive page reload');
  for(let i=0;i<2;i++){await page.locator('#advance').click();await page.waitForFunction(()=>document.getElementById('review').hidden===false);await page.locator('#note').fill('测试决定：通过');await page.locator('#approve').click();await page.waitForFunction(()=>document.getElementById('review').hidden===true);}
  check((await page.locator('#status').innerText()).includes('流程验收完成') && (await page.locator('#status').innerText()).includes('模拟'),'completed state retains simulation label');
  const downloading=page.waitForEvent('download');await page.locator('#export').click();const file=await downloading;await file.saveAs('/private/tmp/aidev-v12-runtime-evidence.json');
  check(file.suggestedFilename().includes('evidence'),'evidence can be exported');check(errors.length===0,'no runtime browser errors');
  return {passed:checks.length,checks,runId:id};
}
