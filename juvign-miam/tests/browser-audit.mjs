import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url)),port=process.env.TEST_PORT||4189;
const server=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port)},stdio:['ignore','ignore','pipe']});
let serverError='';server.stderr.on('data',data=>serverError+=data);
let browser,page;
try{
 const url=`http://127.0.0.1:${port}/`;
 for(let attempt=0;;attempt++){
  if(server.exitCode!==null)throw Error('Test server stopped: '+serverError);
  try{if((await fetch(url)).ok)break;}catch{}
  if(attempt>=40)throw Error('Test server did not become ready.');
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 browser=await chromium.launch({headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(url);
 await page.locator('#starter-dialog').waitFor({state:'visible'});if(await page.locator('#starter-finish').isEnabled())throw Error('Starter can be skipped before construction.');
 const starterCanvas=page.locator('#starter-canvas');await page.locator('[data-starter-add=image]').dragTo(page.locator('.starter-reference'));if(await starterCanvas.locator('[data-starter-select]').count())throw Error('A drop outside the phone added a block.');
 await page.locator('[data-starter-add=image]').dragTo(starterCanvas);await page.locator('[data-starter-property=src]').selectOption('assets/mountain.jpg');await page.locator('[data-starter-add=heading]').dragTo(starterCanvas,{targetPosition:{x:70,y:310}});await page.locator('[data-starter-property=text]').fill('Mon univers');
 const starterIds=await page.evaluate(()=>{const nodes=JSON.parse(localStorage.getItem('juvign-miam-studio-v3')).screens[0].nodes;return {heading:nodes.find(n=>n.type==='heading').id,image:nodes.find(n=>n.type==='image').id};});
 await page.locator('[data-starter-select="'+starterIds.heading+'"]').dragTo(page.locator('[data-starter-select="'+starterIds.image+'"]'),{targetPosition:{x:60,y:3}});await page.locator('[data-starter-add=button]').dragTo(starterCanvas,{targetPosition:{x:70,y:310}});await page.locator('[data-starter-property=text]').fill('Découvrir');

 await page.reload();await page.locator('#starter-finish').click();if(await page.locator('#player [data-player-node]').count()!==3)throw Error('Starter work was not preserved.');await page.reload();if(await page.locator('#starter-dialog').isVisible())throw Error('Completed starter unexpectedly restarted.');
 await page.locator('[data-add-component="heading"]').waitFor();
 const suites=[['player-browser-audit','runAudit'],['navigation-browser-audit','runNavigationAudit'],['extended-components-browser-audit','runExtendedAudit'],['theme-browser-audit','runThemeAudit'],['templates-browser-audit','runTemplateAudit'],['detail-browser-audit','runDetailAudit'],['images-browser-audit','runImageAudit'],['mobile-flow-browser-audit','runMobileFlowAudit'],['icons-browser-audit','runIconAudit'],['camera-browser-audit','runCameraAudit']];
 let total=0;
 for(const [file,run]of suites){const result=await page.evaluate(async([file,run])=>(await import(`/tests/${file}.js`))[run](),[file,run]);console.log(`${file}: ${result.passed}/${result.total}`);if(result.failed.length)throw Error(JSON.stringify(result.failed));total+=result.total;}
 await page.locator('[data-add-component="image"]').click();await page.locator('[data-photo-category]').selectOption('nature');await page.locator('[data-photo-search]').fill('foret');
 if(await page.locator('[data-pick-image]:visible').count()!==1)throw Error('Photo search or category filter failed.');await page.locator('[data-pick-image="assets/forest.jpg"]').click();
 if(!await page.locator('#player img[src="assets/forest.jpg"]').count())throw Error('Selected themed photo did not update.');
 // Exercise editor controls as a student would, including their saved model.
 await page.locator('#new-project').click();await page.locator('[data-template="mobile"]').click();
 const route=await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('juvign-miam-studio-v3'));return {button:p.screens[0].nodes.find(n=>n.type==='button').id,target:p.screens[3].id};});
 await page.locator('#connections').click();await page.locator('[data-connection-source="'+route.button+'"]').first().click();await page.locator('[data-connection-target="'+route.target+'"]').click();await page.waitForFunction(()=>document.querySelectorAll('#connection-lines>path').length>0);await page.locator('[data-close="connections-dialog"]').click();
 await page.locator('#test-mode').click();await page.locator('#player').getByRole('button',{name:'Voir la carte',exact:true}).click();if(await page.locator('#screen-picker').inputValue()!==route.target)throw Error('Visual connection did not navigate.');await page.locator('#design-mode').click();await page.locator('#undo').click();
 await page.locator('[data-tab="screens"]').click();await page.getByRole('button',{name:'Monter Carte dans le menu',exact:true}).click();
 if((await page.locator('#player .rt-tabs b').allTextContents())[0]!=='Carte')throw Error('Menu order did not update.');await page.locator('#undo').click();
 if((await page.locator('#player .rt-tabs b').allTextContents())[0]!=='Accueil')throw Error('Undo did not restore menu order.');
 await page.locator('#test-mode').click();await page.getByRole('button',{name:'Voir la carte',exact:true}).click();
 await page.locator('#player [data-event="item"]').first().click();await page.getByRole('button',{name:'Voir mon panier',exact:true}).click();
 await page.getByRole('button',{name:'Confirmer',exact:true}).click();
 if(!await page.locator('#player').getByText('Commande enregistrée',{exact:true}).count())throw Error('Editor checkout did not reach confirmation.');
 await page.locator('#design-mode').click();await page.locator('[data-navigation-prop=style]').selectOption('both');await page.locator('[data-navigation-prop=headerIcon]').selectOption('profile');await page.locator('#share-app').click();await page.waitForFunction(()=>!document.querySelector('#copy-share').disabled);
 const link=await page.locator('#share-link').inputValue();if(!await page.locator('#share-qr svg').count())throw Error('Starter QR is missing.');
 await page.locator('[data-close="share-dialog"]').click();
 const shared=await browser.newPage({viewport:{width:390,height:844}});await shared.goto(url+'view.html#'+new URL(link).hash.slice(1));await shared.locator('[data-nav-profile]').click();if((await shared.locator('.rt-app-header strong').textContent())!=='Profil')throw Error('Shared profile icon is not linked.');await shared.locator('[data-nav-back]').click();await shared.locator('.rt-tabs button').nth(1).click();if(await shared.locator('[data-event="item"]').count()!==3)throw Error('Shared application catalogue mismatch.');await shared.close();
 const downloadEvent=page.waitForEvent('download');await page.locator('#export-app').click();const download=await downloadEvent;
 const output=path.join(root,'output/playwright');await mkdir(output,{recursive:true});const exported=path.join(output,'ci-export.html');await download.saveAs(exported);
 const offline=await browser.newContext({offline:true,viewport:{width:390,height:844}}),app=await offline.newPage();const external=[];app.on('request',request=>{if(/^https?:/.test(request.url()))external.push(request.url());});app.on('pageerror',error=>errors.push(error.message));
 await app.goto(pathToFileURL(exported).href);await app.locator('.rt-tabs button').nth(1).click();await app.locator('[data-event="item"]').first().click();await app.locator('.rt-tabs button').nth(2).click();await app.getByRole('button',{name:'Confirmer',exact:true}).click();
 if(!await app.getByText('Simulation : aucun paiement ni livraison.',{exact:true}).isVisible())throw Error('Offline confirmation is missing.');
 if(external.length)throw Error('Standalone export made external requests.');await offline.close();
 if(errors.length)throw Error('Browser errors: '+errors.join('; '));console.log(`Passed ${total} browser checks and editor/share/offline export flows.`);
}catch(error){if(page){await mkdir(path.join(root,'output/playwright'),{recursive:true});await page.screenshot({path:path.join(root,'output/playwright/browser-failure.png')}).catch(()=>{});}console.error(error);process.exitCode=1;}
finally{await browser?.close();server.kill();}
