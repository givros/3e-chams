export async function auditEditorDrag(page){
 const assert=(ok,message)=>{if(!ok)throw Error(message);};
 const blank=async()=>{await page.locator('#new-project').click();await page.locator('[data-template="blank"]').click();};
 const project=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('juvign-miam-studio-v3')));
 const phone=()=>page.locator('#player .rt-screen');
 const entries=await page.evaluate(async()=>(await import('/src/studio-library.js')).libraryEntries());
 for(const entry of entries){await blank();await page.locator('#component-search').fill(entry.label);await page.locator('['+entry.attribute+']').dragTo(phone());const p=await project();assert(entry.type==='menu'?p.navigation?.enabled:p.screens[0].nodes.length===1,'Drop failed: '+entry.type);}
 await blank();await page.locator('[data-tab="models"]').click();await page.locator('#model-search').fill('Compteur');await page.locator('[data-screen-model="counter"]').dragTo(phone());let p=await project();assert(p.screens.some(s=>s.name==='Compteur'&&s.nodes.length>1),'Screen model drop');
 await blank();await page.locator('[data-add-component="image"]').dragTo(phone());await page.locator('[data-photo-category]').selectOption('animals');await page.locator('[data-photo-search]').fill('');await page.locator('[data-pick-image="assets/cat.jpg"]').dragTo(page.locator('#player .rt-image'));p=await project();assert(p.screens[0].nodes[0].props.src==='assets/cat.jpg'&&p.screens[0].nodes.length===1,'Photo replacement drop');
 await page.locator('[data-add-component="button"]').dragTo(phone());await page.locator('.icon-picker summary').click();const buttonId=(await project()).screens[0].nodes.find(n=>n.type==='button').id;await page.locator('[data-icon-choice="cart"]').dragTo(page.locator('#player [data-player-node="'+buttonId+'"]'));p=await project();assert(p.screens[0].nodes.find(n=>n.type==='button').props.icon==='cart','Button icon drop');
 await page.locator('[data-add-component="text"]').dragTo(page.locator('#player [data-player-node="'+buttonId+'"]'),{targetPosition:{x:30,y:1}});p=await project();assert(p.screens[0].nodes.map(n=>n.type).join(',')==='image,text,button','Insert a component between existing blocks');
 await page.locator('#library-content [data-select-node="'+buttonId+'"]').click();const imageId=p.screens[0].nodes.find(n=>n.type==='image').id;await page.locator('#player [data-player-node="'+buttonId+'"]>.rt-drag-handle').dragTo(page.locator('#player [data-player-node="'+imageId+'"]'),{targetPosition:{x:30,y:1}});assert((await project()).screens[0].nodes[0].id===buttonId,'Reorder existing screen blocks');await page.locator('#undo').click();assert((await project()).screens[0].nodes.at(-1).id===buttonId,'Undo drop');await page.locator('#redo').click();assert((await project()).screens[0].nodes[0].id===buttonId,'Redo drop');
 await blank();await page.locator('[data-add-columns="2"]').dragTo(phone());p=await project();const group=p.screens[0].nodes[0],left=group.children[0].id,right=group.children[1].id;
 await page.locator('[data-add-component="heading"]').dragTo(page.locator('#player [data-player-drop="'+right+'"]'));p=await project();assert(p.screens[0].nodes[0].children[1].children[0]?.type==='heading','Drop inside second column');
 const heading=p.screens[0].nodes[0].children[1].children[0];await page.locator('#player [data-player-node="'+heading.id+'"] .rt-drag-handle').dragTo(page.locator('#player [data-player-drop="'+left+'"]'));p=await project();assert(p.screens[0].nodes[0].children[0].children[0]?.id===heading.id&&!p.screens[0].nodes[0].children[1].children.length,'Move between columns');
 const before=JSON.stringify(p);await page.locator('#library-content [data-select-node="'+group.id+'"]').click();await page.locator('#player [data-player-node="'+group.id+'"]>.rt-drag-handle').dragTo(page.locator('#player [data-player-drop="'+left+'"]'));assert(JSON.stringify(await project())===before,'Group cannot contain itself');
 await blank();await page.locator('[data-add-component="button"]').dragTo(phone());await page.locator('#events-tab').click();await page.locator('[data-tab="actions"]').click();const target=page.locator('[data-action-target="events.click"]');
 await page.locator('[data-add-action="reset"]').dragTo(target);await page.locator('[data-add-action="toast"]').dragTo(target,{targetPosition:{x:20,y:4}});p=await project();assert(p.screens[0].nodes[0].events.click.map(a=>a.type).join(',')==='toast,reset','Insert action before existing action');
 await page.locator('[data-move-action-block="events.click.0"] .action-heading').dragTo(target,{targetPosition:{x:20,y:await target.evaluate(el=>el.clientHeight-3)}});p=await project();assert(p.screens[0].nodes[0].events.click.map(a=>a.type).join(',')==='reset,toast','Reorder action by dragging');
 await page.locator('[data-add-action="if"]').dragTo(target,{targetPosition:{x:20,y:await target.evaluate(el=>el.clientHeight-3)}});const branch=page.locator('[data-action-target="events.click.2.then"]'),beforeCycle=JSON.stringify(await project());await page.locator('[data-move-action-block="events.click.2"]>.action-heading').dragTo(branch);assert(JSON.stringify(await project())===beforeCycle,'Conditional action cannot contain itself');
 for(const level of ['4e','3e']){
  await page.locator('#studio-settings').click();
  await page.locator('[data-studio-level="'+level+'"]').click();
  await blank();
  await page.locator('[data-add-component=list]').click();
  await page.locator('[data-add-record]').click();
  assert(await page.locator('[data-record-field="1"]').evaluate(el=>document.activeElement===el),'New list row receives focus');
  await page.locator('[data-record-field="1"]').fill('Affiche du club');
  assert((await phone().textContent()).includes('Affiche du club'),'Inline list edit reaches preview');
  await page.locator('[data-add-component=products]').click();
  await page.locator('[data-choose-record-photo]').first().click();
  await page.locator('#record-photo-dialog [data-pick-image="assets/pizza.jpg"]').click();
  assert(!(await page.locator('#record-photo-dialog').isVisible()),'Photo chooser closes after selection');
  await page.locator('[data-tab=photos]').click();
  await page.locator('#library-content [data-photo-category]').selectOption('animals');
  await page.locator('#library-content [data-pick-image="assets/cat.jpg"]').click();
  assert((await project()).screens[0].nodes.some(node=>node.type==='image'&&node.props.src==='assets/cat.jpg'),'Add photo directly from library');
  await page.reload();
  assert(await page.locator('#library-content [data-pick-image="assets/cat.jpg"]').isVisible(),'Photo library restores after reload');
  await page.locator('[data-tab=models]').click();
  await page.locator('[data-screen-model=quiz]').click();
  const quiz=page.locator('#quiz-editor'),first=quiz.locator('.quiz-card').first(),second=quiz.locator('.quiz-card').nth(1);
  await first.locator('[data-quiz-question]').fill('Combien de côtés a un triangle ?');
  await first.locator('[data-quiz-option="0"]').fill('Deux');
  await first.locator('[data-quiz-option="1"]').fill('Trois');
  await first.locator('[data-quiz-option="2"]').fill('Quatre');
  await first.locator('[data-quiz-correct="1"]').check();
  await quiz.locator('[data-add-quiz-question]').click();
  await second.locator('[data-quiz-question]').fill('Quelle est la capitale de la France ?');
  await second.locator('[data-quiz-option="0"]').fill('Lyon');
  await second.locator('[data-quiz-option="1"]').fill('Marseille');
  await second.locator('[data-add-quiz-option]').click();
  await second.locator('[data-quiz-option="2"]').fill('Paris');
  await second.locator('[data-quiz-correct="2"]').check();
  for(const [card,src] of [[first,'cat'],[second,'forest']]){
   await card.locator('[data-quiz-choose-image]').click();
   await page.locator('#record-photo-dialog [data-photo-category]').selectOption('all');
   await page.locator('#record-photo-dialog [data-pick-image="assets/'+src+'.jpg"]').click();
   assert(await card.locator('img[src="assets/'+src+'.jpg"]').count(),'Photo is linked to its quiz question');
  }
  await phone().getByText('Combien de côtés a un triangle ?', {exact:true}).click();
  assert(await quiz.isVisible()&&await page.locator('#inspector-content [data-path="props.text"]').count()>0,'Selecting a question keeps the quiz editor beside the node properties');
  await phone().locator('[data-player-node]').filter({has:page.getByRole('button',{name:'Vérifier',exact:true})}).first().click();
  assert(await quiz.isVisible(),'Selecting a quiz button keeps the quiz editor');
  await phone().locator('[data-player-node]').filter({has:page.getByRole('button',{name:'Corriger tout le quiz',exact:true})}).click();
  assert(await quiz.isVisible(),'Selecting the score button keeps the quiz editor');
  await page.reload();
  assert(await second.locator('[data-quiz-correct="2"]').isChecked(),'Second question survives refresh');
  await page.locator('#test-mode').click();
  await phone().locator('select').first().selectOption('Deux');
  await phone().locator('select').nth(1).selectOption('Paris');
  await phone().getByRole('button',{name:'Corriger tout le quiz'}).click();
  let feedback=await page.locator('#player').textContent();
  assert(feedback.includes('Mauvaise réponse.')&&feedback.includes('Bonne réponse !')&&feedback.includes('Score : 1 / 2'),'Quiz shows individual feedback and total score');
  assert(await phone().locator('select').first().isDisabled(),'The wrong answer is locked after correction');
  await page.locator('#reset-test').click();
  await page.locator('#screen-picker').selectOption({label:'Quiz'});
  await phone().locator('select').first().selectOption('Trois');
  await phone().locator('select').nth(1).selectOption('Paris');
  await phone().getByRole('button',{name:'Corriger tout le quiz'}).click();
  assert((await page.locator('#player').textContent()).includes('Score : 2 / 2'),'Score resets and recomputes');
  await page.locator('#design-mode').click();
  await quiz.locator('[data-quiz-layout]').selectOption('steps');
  await page.locator('#test-mode').click();
  assert(await phone().locator('select').count()===1&&(await phone().textContent()).includes('Question 1 sur 2'),'Step layout starts with one question');
  assert(await phone().locator('img[src="assets/cat.jpg"]').count()===1&&!(await phone().locator('img[src="assets/forest.jpg"]').count()),'Only the current question image is shown');
  const order=await phone().locator('[data-player-node]').evaluateAll(nodes=>nodes.map(node=>node.querySelector('img')?'image':node.querySelector('select')?'answers':node.textContent.trim()));
  const questionIndex=order.indexOf('Combien de côtés a un triangle ?');
  assert(order[questionIndex+1]==='image'&&order[questionIndex+2]==='answers','Question image is between the prompt and the answers');
  await phone().getByRole('button',{name:'Suivante'}).click();
  await page.reload();
  assert((await phone().textContent()).includes('Question 2 sur 2'),'Quiz step survives refresh');
  assert(await phone().locator('img[src="assets/forest.jpg"]').count()===1&&!(await phone().locator('img[src="assets/cat.jpg"]').count()),'The second question restores its own image');
  assert(!(await phone().getByRole('button',{name:'Précédente'}).count()),'Step layout has no previous question button');
  await phone().getByRole('button',{name:'Recommencer le quiz'}).click();
  assert((await phone().textContent()).includes('Question 1 sur 2'),'Restart returns to the first question');
  assert(await phone().locator('select').isEnabled()&&await phone().locator('select').inputValue()==='','Restart clears and unlocks the previous answer');
  await page.reload();
  assert((await phone().textContent()).includes('Question 1 sur 2')&&await phone().locator('select').inputValue()==='','Restart persists on refresh');
  await page.locator('#design-mode').click();
  await quiz.locator('[data-quiz-layout]').selectOption('auto');
  await page.locator('#test-mode').click();
  await page.locator('#reset-test').click();
  await page.locator('#screen-picker').selectOption({label:'Quiz'});
  await phone().locator('select').selectOption('Quatre');
  assert((await phone().textContent()).includes('Question 2 sur 2'),'Selecting an answer advances the quiz');
  await phone().locator('select').selectOption('Paris');
  await phone().getByRole('button',{name:'Corriger tout le quiz'}).click();
  assert((await page.locator('#player').textContent()).includes('Score : 1 / 2'),'Step layout retains both answers for scoring');
  await page.locator('#design-mode').click();
  await second.locator('[data-delete-quiz-question]').click();
  assert(await quiz.locator('.quiz-card').count()===1,'Removing a question updates the editor');
  assert(!(await phone().locator('img[src="assets/forest.jpg"]').count()),'Deleting a question removes its image');
  assert(!(await phone().getByRole('button',{name:'Corriger tout le quiz'}).count()),'Removing the second question removes the total score button');
 }
 console.log('Passed drag-and-drop for '+entries.length+' library entries, models, assets, nested columns and actions.');
}

export async function auditQuizTutorial(browser,url){
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 try{
  await page.goto(url);
  await page.locator('[data-studio-level="4e"]').click();
  const demo=page.locator('#quiz-wizard'),example=demo.locator('.rt-screen');
  const wizard=page.locator('#quiz-build-guide'),app=page.locator('#player .rt-screen'),next=wizard.locator('[data-quiz-wizard-move="1"]');
  await demo.getByRole('heading',{name:'Essaie un quiz terminé'}).waitFor();
  if(!(await example.locator('img[src="assets/beach.jpg"]').count()))throw Error('The demo question has no illustration.');
  const nextQuestion=example.getByRole('button',{name:'Suivante'});
  if(await nextQuestion.isEnabled())throw Error('Quiz advances without verification.');
  await example.locator('select').selectOption('La pieuvre');
  await example.getByRole('button',{name:'Vérifier'}).click();
  if(!(await example.locator('select').isDisabled())||await example.getByRole('button',{name:'Vérifier'}).count()||!(await example.getByText('Résultat : Mauvaise réponse.').count()))throw Error('Incorrect answer can be retried.');
  await nextQuestion.click();
  if(await example.getByRole('button',{name:'Précédente'}).count())throw Error('Quiz example allows going back.');
  if(!(await example.getByText('Question 2 sur 5').count()))throw Error('Quiz example is not playable.');
  await demo.getByRole('button',{name:'Créer mon quiz'}).click();

  if(await demo.isVisible()||await app.locator('[data-player-node]').count())throw Error('Challenge did not start in a blank studio.');
  await wizard.getByRole('heading',{name:'Installe le modèle Quiz'}).waitFor();
  await page.reload();
  await wizard.getByRole('heading',{name:'Installe le modèle Quiz'}).waitFor();
  await page.locator('[data-tab=models]').click();
  const model=page.locator('[data-screen-model=quiz]');
  if(await page.locator('[data-screen-model]').count()<2||!await page.locator('[data-screen-model=welcome]').isDisabled()||!await page.locator('[data-tab=components]').isVisible()||await page.locator('#add-screen').isEnabled())throw Error('Unrelated tools should stay visible but disabled during model installation.');
  await model.click();
  if(await app.locator('[data-player-node]').count())throw Error('Challenge accepted a click instead of a drag.');
  await model.dragTo(app);
  await wizard.getByRole('heading',{name:'Choisis ton thème'}).waitFor();
  if(!await page.locator('[data-tab=models]').isVisible()||!await page.locator('[data-screen-model=quiz]').isDisabled()||!await page.locator('#theme-tab').isVisible()||await page.locator('#connections').isEnabled()||await page.locator('#undo').isEnabled())throw Error('The model or another editor tool is enabled during the challenge.');
  await page.locator('[data-tab=components]').click();
  if(!await page.locator('[data-add-component=heading]').isVisible()||!await page.locator('[data-add-component=heading]').isDisabled())throw Error('Components should remain visible but disabled.');
  await app.getByText('Quiz',{exact:true}).click();
  if(!await page.locator('#inspector-content [data-path="props.text"]').isDisabled())throw Error('Clicking a block opens editable properties.');
  if(await next.isEnabled())throw Error('Wizard accepts a missing theme.');
  await wizard.locator('[data-quiz-theme]').fill('Les animaux');
  await next.click();
  for(let i=0;i<5;i++){
   await wizard.locator('[data-quiz-question]').fill('Quel animal correspond à la question '+(i+1)+' ?');
   await wizard.locator('[data-quiz-option="0"]').fill('Chat');
   await wizard.locator('[data-quiz-option="1"]').fill('Loutre');
   if(await next.isEnabled())throw Error('Wizard accepts a question without a correct answer.');
   if(i===2){
    await page.reload();
    if(await wizard.locator('[data-quiz-question]').inputValue()!=='Quel animal correspond à la question 3 ?')throw Error('Wizard did not restore the current question.');
   }
   await wizard.locator('[data-quiz-correct="'+(i===4?1:0)+'"]').check();
   if(i===4){
    if(await next.isEnabled())throw Error('Wizard accepts a quiz without an image.');
    const fileChooser=page.waitForEvent('filechooser');
    await wizard.locator('[data-quiz-import-image]').click();
    const photo=await page.request.get(url+'assets/cat.jpg');
    await (await fileChooser).setFiles({name:'illustration.jpg',mimeType:'image/jpeg',buffer:await photo.body()});
    await wizard.locator('.quiz-question-image img[src^="data:image/"]').waitFor();
   }
   await next.click();
  }
  await wizard.locator('[data-quiz-layout]').selectOption('all');
  await next.click();
  for(let i=0;i<4;i++)await app.locator('select').nth(i).selectOption('Chat');
  const finish=wizard.locator('[data-finish-quiz-wizard]');
  if(!(await app.locator('img[src^="data:image/"]').count()))throw Error('The imported quiz image was missing from the wizard test.');
  await app.getByRole('button',{name:'Corriger tout le quiz'}).click();
  if(await finish.isEnabled())throw Error('Wizard passed before all questions were answered.');
  await page.reload();
  if(await app.locator('select').first().inputValue()!=='Chat')throw Error('Wizard lost test answers on refresh.');
  await app.locator('select').nth(4).selectOption('Loutre');
  await app.getByRole('button',{name:'Corriger tout le quiz'}).click();
  await finish.click();
  await page.locator('#quiz-editor').getByText('Quiz terminé et testé.').waitFor();
  if(!(await page.locator('[data-tab=components]').isVisible())||!(await page.locator('#add-screen').isEnabled())||!(await page.locator('#theme-tab').isVisible()))throw Error('Editor tools were not restored after the challenge.');
  const projectName=await page.locator('#project-name').inputValue();
  await page.locator('#new-project').click();
  await page.locator('[data-template=quiz-tutorial]').click();
  await demo.getByRole('heading',{name:'Essaie un quiz terminé'}).waitFor();
  await demo.getByRole('button',{name:'Fermer le défi'}).click();
  if(await page.locator('#project-name').inputValue()!==projectName)throw Error('Example replaced the active project.');
  console.log('Passed the 4e quiz example, guided stages, refresh recovery, and handoff to the studio.');
 }finally{await page.close();}
}
