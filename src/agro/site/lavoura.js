(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const {api, node, failure, fields, fieldPayload, dateText, renderRecommendation} = window.Cereja;
  const login = $('#loginForm'), area = $('#farmArea'), status = $('#farmStatus');
  const cycleForm = $('#cycleForm'), taskForm = $('#taskForm'), savedForm = $('#savedForm');
  const farmToday = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Porto_Velho', year:'numeric',
    month:'2-digit', day:'2-digit'}).formatToParts(new Date());
  const localDate = ['year','month','day'].map(k=>farmToday.find(p=>p.type===k).value).join('-');
  let account, refresh, generation = 0, snapshot = {}, cultures = [];
  for (const el of document.querySelectorAll('input[name=reference_date],input[name=planted_on]')) el.max = localDate;
  $('#calendarFilters').elements.plantio.max = localDate;
  function message(text, error = false) {
    status.textContent = text;
    status.classList.toggle('app-error', error);
  }
  function session(result) {
    return {...result, expiresAt:Date.now() + result.expires_in * 1000};
  }
  function leave(text) {
    ++generation;
    account = null; snapshot = {};
    area.hidden = true; login.hidden = false;
    for (const id of ['plotList','cycleList','taskList','savedList','savedResult']) $('#'+id).replaceChildren();
    for (const form of area.querySelectorAll('form')) form.reset();
    for (const select of area.querySelectorAll('.plot-select,select[name=parent_id],select[name=cycle_id]')) select.replaceChildren();
    message(text);
  }
  async function privateApi(path, options = {}) {
    if (!account) throw new Error('Entre na sua conta.');
    const generationAtStart=generation;
    if (Date.now() > account.expiresAt-30_000 && account.refresh_token) {
      const current = account;
      refresh ??= api('/api/auth/refresh', {method:'POST', body:{refresh_token:current.refresh_token}})
        .then(result => { if (account===current) account=session(result); })
        .finally(() => { refresh=null; });
      try { await refresh; } catch (error) {
        if (generation===generationAtStart && error.status===401) leave('A sessão expirou. Entre novamente.');
        throw error;
      }
    }
    const token = account?.access_token;
    if (!token || generation!==generationAtStart) throw new Error('A sessão terminou.');
    try {
      const data=await api('/api/lavoura'+path, {...options,token});
      if (generation!==generationAtStart) throw new Error('A sessão terminou.');
      return data;
    } catch (error) {
      if (generation===generationAtStart && error.status===401) leave('A sessão expirou. Entre novamente.');
      throw error;
    }
  }
  function replaceOptions(select, options, first) {
    const selected = select.value;
    select.replaceChildren(new Option(first,''));
    for (const [label,value] of options) select.add(new Option(label,value));
    if (options.some(([,id])=>id===selected)) select.value=selected;
  }
  function cultureName(key) { return cultures.find(c=>c.culture_id===key)?.name || key; }
  function plotName(id) { return snapshot.plots?.find(p=>p.id===id)?.name || 'Talhão'; }
  function cycleName(c) { return cultureName(c.culture_id)+' · '+dateText(c.planted_on); }
  function linkedCycles() {
    const cid=cycleForm.elements.culture_id.value, selectedCulture=cultures.find(c=>c.culture_id===cid);
    const parent=cycleForm.elements.parent_id, target=taskForm.elements.cycle_id;
    const parentCandidates=(snapshot.cycles || []).filter(c=>c.kind==='cafe' && c.plot_id===cycleForm.elements.plot_id.value);
    replaceOptions(parent, parentCandidates.map(c=>[cycleName(c),c.id]), 'Sem vínculo');
    parent.disabled=selectedCulture?.kind!=='entrelinha';
    if (parent.disabled) parent.value='';
    replaceOptions(target,(snapshot.cycles || []).filter(c=>c.plot_id===taskForm.elements.plot_id.value)
      .map(c=>[cycleName(c),c.id]),'Sem vínculo');
  }
  function drawList(id, rows, empty, renderer) {
    $('#'+id).replaceChildren(...(rows.length ? rows.map(renderer) : [node('p',empty)]));
  }
  function dayAction(label, action, run) {
    const form=node('form',null,'mini-form'), input=node('input'), button=node('button',action,'btn outline');
    input.type='date'; input.required=true; input.value=localDate; input.max=localDate;
    input.setAttribute('aria-label',label); button.type='submit';
    form.append(input,button);
    form.addEventListener('submit', async event=>{event.preventDefault(); await perform(button,()=>run(input.value));});
    return form;
  }
  function renderPrivate() {
    const {plots,cycles,tasks,assessments}=snapshot;
    document.querySelectorAll('.plot-select').forEach(select=>replaceOptions(select, plots.map(p=>[p.name,p.id]), 'Selecione um talhão'));
    replaceOptions(cycleForm.elements.culture_id, cultures.map(c=>[c.name,c.culture_id]), 'Selecione uma cultura');
    linkedCycles();
    drawList('plotList',plots,'Nenhum talhão cadastrado.', plot=>{
      const card=node('div',null,'private-item');
      card.append(node('strong',plot.name),node('p',plot.lat+', '+plot.lon)); return card;
    });
    drawList('cycleList',cycles,'Nenhum ciclo de cultivo.', cycle=>{
      const card=node('div',null,'private-item');
      const parent=cycles.find(c=>c.id===cycle.parent_id);
      card.append(node('strong',cycleName(cycle)),
        node('p',plotName(cycle.plot_id)+' · '+(cycle.ended_on?'Encerrado em '+dateText(cycle.ended_on):'Em andamento')+
          (parent?' · Vinculado a '+cultureName(parent.culture_id):'')));
      if (!cycle.ended_on) card.append(dayAction('Data de encerramento','Encerrar ciclo',
        day=>privateApi('/ciclos/'+cycle.id,{method:'PATCH',body:{ended_on:day}})));
      return card;
    });
    drawList('taskList',tasks,'Nenhuma tarefa registrada.', task=>{
      const card=node('div',null,'private-item');
      const label=({planejada:'Planejada',realizada:'Realizada',cancelada:'Cancelada'})[task.state];
      card.append(node('strong',task.title),node('p',plotName(task.plot_id)+' · '+label+' · Prevista para '+dateText(task.planned_on)
        +(task.done_on?' · Realizada em '+dateText(task.done_on):'')));
      if (task.state==='planejada') {
        const cancel=node('button','Cancelar tarefa','btn outline');
        cancel.type='button';
        cancel.addEventListener('click',()=>perform(cancel,()=>privateApi('/tarefas/'+task.id,{method:'PATCH',body:{state:'cancelada'}})));
        card.append(dayAction('Data realizada','Marcar realizada',
          day=>privateApi('/tarefas/'+task.id,{method:'PATCH',body:{state:'realizada',done_on:day}})),cancel);
      }
      return card;
    });
    drawList('savedList',assessments,'Nenhuma avaliação salva.', record=>{
      const card=node('div',null,'private-item'), open=node('button','Abrir avaliação','btn outline');
      open.type='button';
      open.addEventListener('click',async()=>{
        const output=$('#savedResult'), current=generation;
        open.disabled=true;
        try {
          const result=await privateApi('/avaliacoes/'+record.id);
          if (account && current===generation) renderRecommendation(output,result);
        } catch (error) { if (account && current===generation) failure(output,error.message); }
        finally { open.disabled=false; }
      });
      card.append(node('p',plotName(record.plot_id)+' · '+dateText(record.reference_date)),open);
      return card;
    });
  }
  async function loadFarm() {
    const data=await privateApi('');
    if (!account) return;
    snapshot=data;
    renderPrivate();
  }
  async function perform(button, action, form) {
    const current=generation;
    button.disabled=true;
    try {
      await action();
      if (current===generation && account) { form?.reset(); await loadFarm(); message('Registro atualizado.'); }
    } catch (error) { if (current===generation) message(error.message,true); }
    finally { button.disabled=false; }
  }
  login.addEventListener('submit', async event=>{
    event.preventDefault();
    const button=event.submitter, action=button?.value || 'login';
    const buttons=[...login.querySelectorAll('button')];
    buttons.forEach(b=>{b.disabled=true;});
    try {
      const result=await api('/api/auth/'+action, {method:'POST',body:fields(login)});
      login.reset();
      if (!result.access_token) return message('Se for necessário, confirme o cadastro pelo e-mail e depois entre.');
      ++generation; account=session(result);
      const data=await api('/api/calendario');
      cultures=data.cultures;
      await loadFarm();
      login.hidden=true; area.hidden=false;
      message('Sessão ativa. Os registros desta área são privados.');
    } catch (error) { leave(error.message); }
    finally { buttons.forEach(b=>{b.disabled=false;}); }
  });
  $('#logout').addEventListener('click', async ()=>{
    const token=account?.access_token;
    leave('Sessão encerrada neste navegador.');
    if (token) await api('/api/auth/logout',{method:'POST',token,body:{}}).catch(()=>{});
  });
  for (const [id,path] of [['plotForm','/talhoes'],['cycleForm','/ciclos'],['taskForm','/tarefas'],['savedForm','/avaliacoes']]) {
    const form=$('#'+id);
    form.addEventListener('submit', event=>{
      event.preventDefault();
      const body=form===savedForm ? fieldPayload(form) : fields(form);
      perform(form.querySelector('button[type=submit]'),()=>privateApi(path,{method:'POST',body}),form);
    });
  }
  for (const el of [cycleForm.elements.plot_id,cycleForm.elements.culture_id,taskForm.elements.plot_id]) {
    el.addEventListener('change',linkedCycles);
  }
  api('/api/config').then(config=>{
    login.hidden=!config.minha_lavoura;
    message(config.minha_lavoura ? 'Entre para abrir seu caderno de campo.'
      : 'O caderno de campo ainda não foi habilitado neste ambiente.');
  }).catch(error=>message(error.message,true));
})();
