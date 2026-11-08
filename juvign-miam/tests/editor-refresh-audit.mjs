export async function auditEditorRefresh(page){
 const assert=(ok,message)=>{if(!ok)throw Error(message);};
 await page.locator('#new-project').click();await page.locator('[data-template="mobile"]').click();
 const info=await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('juvign-miam-studio-v3'));return {id:p.id,profile:p.screens[3].id,node:p.screens[3].nodes.find(n=>n.type==='input').id};});
 await page.locator('#screen-picker').selectOption(info.profile);await page.locator('#player [data-player-node="'+info.node+'"]').click();await page.locator('#theme-tab').click();await page.reload();
 assert(await page.locator('#screen-picker').inputValue()===info.profile,'Working screen restored');assert((await page.locator('#theme-tab').getAttribute('class')).includes('active'),'Inspector tab restored');
 await page.locator('#test-mode').click();await page.locator('#player input').first().fill('Alex');await page.locator('#player .rt-tabs button').nth(1).click();await page.locator('#player [data-event=item]').first().click();await page.locator('#player .rt-tabs button').nth(2).click();await page.locator('#player [data-cart="1"]').click();await page.reload();
 assert((await page.locator('#test-mode').getAttribute('class')).includes('active'),'Test mode restored');assert(await page.locator('#player .rt-cart-row b').first().textContent()==='2','Cart restored');
 await page.locator('#player [data-nav-back]').click();assert((await page.locator('#screen-picker option:checked').textContent()).includes('Carte'),'Back history restored');await page.locator('#player .rt-tabs button').nth(3).click();assert(await page.locator('#player input').first().inputValue()==='Alex','Typed data restored');
 await page.locator('#design-mode').click();await page.locator('#preview-app').click();await page.locator('#preview-host .rt-tabs button').nth(3).click();await page.locator('#preview-host input').first().fill('Sam');await page.reload();assert(await page.locator('#preview-dialog').isVisible(),'Full preview reopened');assert(await page.locator('#preview-host input').first().inputValue()==='Sam','Preview input restored');await page.locator('[data-close=preview-dialog]').click();await page.locator('#test-mode').click();assert(await page.locator('#player input').first().inputValue()==='Alex','Editor test and full preview remain independent');
 await page.locator('#design-mode').click();await page.locator('#connections').click();const source=await page.evaluate(()=>JSON.parse(localStorage.getItem('juvign-miam-studio-v3')).screens[0].nodes.find(n=>n.type==='button').id);await page.locator('[data-connection-source="'+source+'"]').first().click();await page.reload();assert(await page.locator('#connections-dialog').isVisible(),'Connections view restored');assert(await page.locator('#connection-cards [data-connection-source="'+source+'"].selected').count()===1,'Selected connection source restored');await page.locator('[data-close=connections-dialog]').click();
 await page.addInitScript(id=>localStorage.setItem('juvign-miam-editor-session-v1-'+id,'{invalid'),info.id);await page.reload();assert(await page.evaluate(id=>JSON.parse(localStorage.getItem('juvign-miam-studio-v3')).id===id,info.id),'Corrupt context does not discard the project');
 await page.locator('#new-project').click();await page.locator('[data-template=blank]').click();await page.locator('#projects').click();
 assert(await page.locator('#project-list button,#project-list input').count()===0,'Library only offers viewing links');
 const opened=page.context().waitForEvent('page');
 await page.locator('a[href="view.html?local='+info.id+'"]').click();
 const viewer=await opened;
 await viewer.locator('#application [data-player-node]').first().waitFor();
 assert(new URL(viewer.url()).searchParams.get('local')===info.id,'Library opens the saved application in a separate tab');
 await viewer.close();
 await page.locator('[data-close=projects-dialog]').click();
 console.log('Passed refresh recovery for editor position, test data, back history, preview and the read-only project library.');
}
