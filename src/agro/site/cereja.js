(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const node = (tag, text, cls) => {
    const element = document.createElement(tag);
    if (text != null) element.textContent = text;
    if (cls) element.className = cls;
    return element;
  };
  const failure = (element, message) => element.replaceChildren(node('p', message, 'app-error'));
  const dateText = iso => iso?.slice(0, 10).split('-').reverse().join('/') || '';
  const fmt = new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 2});
  const numberText = value => fmt.format(value);
  const fields = form => Object.fromEntries(new FormData(form));
  const fieldPayload = form => {
    const {reference_date, plot_id, ...raw} = fields(form);
    const field = {};
    for (const [key, value] of Object.entries(raw)) {
      if (value !== '') field[key] = value === 'true' ? true : value === 'false' ? false : value;
    }
    return {reference_date, plot_id, field};
  };
  async function api(path, {method = 'GET', body, token, signal} = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = 'Bearer ' + token;
    let response;
    try {
      response = await fetch(path, {method, headers, signal, body: body === undefined ? undefined : JSON.stringify(body)});
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      throw new Error('Não foi possível acessar o serviço. Tente novamente.');
    }
    const result = await response.json();
    if (!response.ok) throw Object.assign(new Error(result.error || 'Não foi possível concluir.'), {status: response.status});
    return result;
  }
  const labels = {
    temp_mean_c:'Temperatura média',temp_min_c:'Temperatura mínima',temp_max_c:'Temperatura máxima',
    humidity_pct:'Umidade do ar',wind_2m_m_s:'Vento a 2 m',solar_mj_m2_day:'Radiação solar',
    precip_power_mm:'Precipitação diária',precip_mm:'Precipitação diária',soil_ph:'pH do solo',
    elevation_m:'Altitude',air_temperature_c:'Temperatura média · 30 dias',recent_rain_mm:'Chuva · 30 dias',
    seasonal_rain_mm:'Chuva sazonal · média dos meses completos'
  };
  const units = {air_temperature_c:'°C',recent_rain_mm:'mm',seasonal_rain_mm:'mm'};
  function sourceLink(source, title) {
    const url = source?.url;
    if (typeof url !== 'string' || !/^https?:\/\//.test(url)) return node('span', title);
    const link = node('a', title);
    Object.assign(link, {href:url, target:'_blank', rel:'noopener noreferrer'});
    return link;
  }
  function renderDiagnosis(output, result) {
    if (!result.inside || !result.cell_id) {
      output.replaceChildren(node('p', 'Diagnóstico indisponível para este ponto. A área de estudo cobre até 20 km da sede de Cacoal.'));
      return;
    }
    const contents = [node('p', 'Malha de '+result.cell_grid_km+' km · '+result.cell_id+' · '+numberText(result.distance_km)+' km da sede')];
    for (const [title, items] of [['Clima · última observação por fonte e métrica',result.daily],['Solo e relevo · estimativas regionais',result.static]]) {
      if (!items.length) continue;
      const list = node('ul', null, 'observation-list');
      for (const item of items) {
        const li = node('li'), label = labels[item.metric] ?? item.metric, unit = item.unit === 'C' ? '°C' : item.unit;
        const provenance = node('small');
        provenance.append(sourceLink(item, item.product), document.createTextNode(
          [item.observed_on && dateText(item.observed_on), item.native_resolution, item.quality === 'estimated' && 'estimativa',
            item.depth_bottom_cm > 0 && item.depth_top_cm+'–'+item.depth_bottom_cm+' cm'].filter(Boolean).map(part=>' · '+part).join('')));
        li.append(node('strong', label), node('span', numberText(item.value)+' '+unit), provenance);
        list.append(li);
      }
      contents.push(node('h4', title), list);
    }
    if (result.missing.length) contents.push(node('p', 'Dados não disponíveis nesta célula: '+result.missing.join(', ')+'.'));
    output.replaceChildren(...contents);
  }
  const stateNames = {favoravel:'Favorável',atencao:'Atenção',desfavoravel:'Desfavorável',sem_dados:'Sem dados suficientes'};
  function renderRecommendation(output, result) {
    if (!result.inside) return failure(output, result.message);
    const intro = node('p', 'Referência: '+dateText(result.reference_date)+' · Malha '+result.cell_id+' · Método '+result.method_version);
    const values = node('ul', null, 'observation-list');
    for (const [key, measure] of Object.entries(result.measurements)) {
      const li = node('li');
      li.append(node('strong', labels[key]), node('span', numberText(measure.value)+' '+units[key]),
        node('small', measure.source_id+' · '+measure.period_count+' período(s) completo(s)'));
      values.append(li);
    }
    const coverage = node('details');
    coverage.append(node('summary', 'Ver fontes e cobertura dos períodos climáticos'));
    const scroll = node('div', null, 'table-scroll'), table = node('table', null, 'coverage-table');
    const head = table.createTHead().insertRow();
    for (const item of ['Fonte e métrica','Período','Dias disponíveis']) head.append(node('th', item));
    const tb = table.createTBody();
    for (const item of result.coverage) {
      const tr = tb.insertRow();
      const source = tr.insertCell();
      source.append(sourceLink(item, item.product), node('small', ' · '+(labels[item.metric] ?? item.metric)+(item.native_resolution ? ' · '+item.native_resolution : '')));
      tr.insertCell().textContent = dateText(item.start_on)+' – '+dateText(item.end_on);
      tr.insertCell().textContent = item.days_available+'/'+item.days_expected+(item.value == null ? ' · incompleto' : '');
    }
    scroll.append(table); coverage.append(scroll);
    const grid = node('ul', null, 'candidate-grid');
    for (const candidate of result.candidates) {
      const card = node('li');
      card.append(node('strong', candidate.name),
        node('span', stateNames[candidate.state], 'state-pill state-'+candidate.state),
        node('p', candidate.reasons.join(' ')));
      if (candidate.missing.length) {
        const missing = node('details');
        missing.append(node('summary','O que falta verificar'),node('p',candidate.missing.join('; ')+'.'));
        card.append(missing);
      }
      for (const source of candidate.sources) {
        const small = node('small');
        small.append(sourceLink(source, source.title+' · '+source.detail+' · v'+(source.rule_version ?? source.requirement_version)));
        card.append(small);
      }
      grid.append(card);
    }
    output.replaceChildren(intro, values, coverage, grid);
  }
  document.querySelectorAll('.field-inputs').forEach(el => el.append($('#fieldInputs').content.cloneNode(true)));
  window.Cereja = {api, node, failure, fields, fieldPayload, dateText, renderRecommendation};

  const diagnostic = $('#diagnosticResult'), recOutput = $('#recommendResult'), recForm = $('#recommendForm');
  const recButton = recForm.querySelector('button[type=submit]');
  let activePoint = null, diagnosticRequest, recRequest, calendarScope;
  function clearPoint() {
    activePoint = null;
    if (calendarScope) { calendarScope = undefined; refreshCalendar(); }
    recRequest?.abort();
    recButton.disabled = true;
    recOutput.replaceChildren(node('p', 'Consulte uma localização dentro da área para começar.'));
  }
  for (const el of [$('#diagLat'), $('#diagLon')]) el.addEventListener('input', () => {
    diagnosticRequest?.abort();
    clearPoint();
    diagnostic.replaceChildren(node('p', 'As coordenadas mudaram. Envie uma nova consulta.'));
  });
  $('#farmForm').addEventListener('submit', async event => {
    event.preventDefault();
    const location = fields(event.currentTarget);
    clearPoint();
    diagnosticRequest?.abort();
    const request = diagnosticRequest = new AbortController();
    diagnostic.replaceChildren(node('p', 'Consultando a região…'));
    try {
      const result = await api('/api/consulta?'+new URLSearchParams(location), {signal:request.signal});
      if (request.signal.aborted) return;
      renderDiagnosis(diagnostic, result);
      if (result.inside && result.cell_id) {
        activePoint = location;
        if (result.municipality) { calendarScope = result.municipality; refreshCalendar(); }
        recButton.disabled = false;
        recOutput.replaceChildren(node('p', 'Preencha as informações de campo disponíveis e avalie as candidatas.'));
      }
    } catch (error) {
      if (error.name !== 'AbortError') failure(diagnostic, error.message);
    }
  });
  recForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!activePoint) return;
    recRequest?.abort();
    const request = recRequest = new AbortController();
    recButton.disabled = true;
    recOutput.replaceChildren(node('p', 'Avaliando as espécies…'));
    try {
      const result = await api('/api/recomendacoes', {method:'POST', signal:request.signal,
        body:{...activePoint,...fieldPayload(recForm)}});
      if (!request.signal.aborted) renderRecommendation(recOutput, result);
    } catch (error) {
      if (error.name !== 'AbortError') failure(recOutput, error.message);
    } finally {
      if (!request.signal.aborted) recButton.disabled = !activePoint;
    }
  });

  const months = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  const activities = {plantio:'Plantio',colheita:'Colheita',corte:'Corte',rocada:'Roçada',manejo:'Manejo',monitoramento:'Monitoramento'};
  const activityOrder = Object.keys(activities);
  const contexts = {qualquer:'qualquer fase',implantacao:'implantação',formacao:'formação',producao:'produção',recepa:'recepa',
    ambos:'sequeiro e irrigado',sequeiro:'sequeiro',irrigado:'irrigado'};
  const filters = $('#calendarFilters'), status = $('#calendarStatus'), calendar = $('#calendarScroll'), extra = $('#calendarExtra');
  const dialog = $('#ruleDialog');
  function showRule(rule, culture) {
    $('#ruleTitle').textContent = activities[rule.activity]+' · '+culture;
    const period = rule.starts_on ? dateText(rule.starts_on)+' a '+dateText(rule.ends_on)+' · projeção desde o plantio informado'
      : rule.months.length ? rule.months.map(m => months[m-1]).join(', ')+' · janela sazonal'
      : rule.kind === 'condicional' ? 'Depende das condições de campo.' : 'Informe a data real de plantio para calcular o período.';
    const source = node('p', 'Fonte: ');
    source.append(sourceLink(rule.source, rule.source.title+' · '+rule.source_detail+' · versão '+rule.version));
    $('#ruleDetails').replaceChildren(node('p', period),
      node('p', (rule.municipality === '1100049' ? 'Cacoal, RO' : rule.municipality ?
        'Município IBGE '+rule.municipality+', RO' : rule.uf || 'Referência geral')+' · '+contexts[rule.phase]+' · '+contexts[rule.water]),
      node('p', rule.orientation), source);
    dialog.showModal();
  }
  function renderCalendar(data, chosen) {
    const table = node('div', null, 'season-table');
    const conditions = node('div', null, 'season-conditions');
    function row(title, cls) {
      const item = node('div', null, 'season-row '+(cls ?? ''));
      const track = node('div', null, 'season-track');
      item.append(node('div', title, 'season-row-title'), track);
      table.append(item);
      return track;
    }
    function todayMarker(track) {
      if (data.today_month == null) return;
      const line = node('span', null, 'month-now');
      line.setAttribute('aria-hidden','true');
      line.style.setProperty('--month-index',data.months.indexOf(data.today_month));
      track.append(line);
    }
    const header = row('Cultura', 'season-header');
    data.months.forEach((month, index) => {
      const label = node('span', months[month-1], 'season-month');
      label.style.gridColumn = index + 1;
      if (month === data.today_month) label.setAttribute('aria-current','date');
      header.append(label);
    });
    for (const [kind, title] of [['cafe','Café'],['entrelinha','Entrelinhas']]) {
      const cultures = data.cultures.filter(c => c.kind === kind && (!chosen || c.culture_id === chosen));
      if (!cultures.length) continue;
      row(title, 'season-group');
      for (const culture of cultures) {
        const track = row(culture.name);
        const rules = data.rules.filter(r => r.culture_id === culture.culture_id)
          .sort((a,b)=>activityOrder.indexOf(a.activity)-activityOrder.indexOf(b.activity));
        let lane = 1;
        for (const rule of rules) {
          const action = activities[rule.activity];
          if (!rule.months.length) {
            const description = rule.kind === 'condicional' ? 'Depende das condições'
              : rule.starts_on ? 'Projeção fora desta safra' : 'Informe a data de plantio';
            const info = node('button', culture.name+' · '+action+': '+description, 'condition-btn');
            info.type = 'button';
            info.addEventListener('click', () => showRule(rule, culture.name));
            conditions.append(info);
            continue;
          }
          const idx = data.months.flatMap((m,i) => rule.months.includes(m) ? [i] : []);
          const groups = [];
          for (const i of idx) {
            if (groups.at(-1)?.at(-1) === i-1) groups.at(-1).push(i);
            else groups.push([i]);
          }
          for (const group of groups) {
            const button = node('button', action, 'season-bar activity-'+rule.activity+(rule.starts_on ? ' projected' : ''));
            button.type = 'button';
            button.style.gridColumn = (group[0]+1)+' / '+(group.at(-1)+2);
            button.style.gridRow = lane;
            button.setAttribute('aria-label', culture.name+' · '+action+' · '+group.map(i=>months[data.months[i]-1]).join(' a '));
            button.addEventListener('click', () => showRule(rule, culture.name));
            track.append(button);
          }
          lane++;
        }
        if (lane === 1) {
          const text = node('span', rules.length ? 'Veja as condições abaixo' : 'Sem janela publicada para os filtros', 'season-empty');
          track.append(text);
        }
        todayMarker(track);
      }
    }
    calendar.replaceChildren(table);
    extra.replaceChildren(...(conditions.childElementCount ? [node('p','Orientações sem barra para esta safra'),conditions] : []));
    status.textContent = 'Safra '+data.year+'/'+(data.year+1)+' · outubro a setembro'+(data.today_month ? ' · linha pontilhada: mês atual' : '');
  }
  let pendingCalendar;
  async function refreshCalendar() {
    pendingCalendar?.abort();
    const request = pendingCalendar = new AbortController();
    const chosen = fields(filters);
    const params = new URLSearchParams(Object.entries(chosen).filter(([,v]) => v));
    if (calendarScope) params.set('municipio',calendarScope);
    status.textContent = 'Carregando calendário…';
    try {
      const data = await api('/api/calendario?'+params, {signal:request.signal});
      if (request.signal.aborted) return;
      const year = $('#seasonYear');
      if (!year.options.length) {
        for (let n = data.year-3; n <= data.year+2; n++) year.add(new Option(n+'/'+(n+1), n, false, n===data.year));
      }
      if ($('#seasonCulture').options.length === 1) {
        for (const culture of data.cultures) $('#seasonCulture').add(new Option(culture.name, culture.culture_id));
      }
      renderCalendar(data, chosen.cultura);
    } catch (error) {
      if (error.name !== 'AbortError') {
        calendar.replaceChildren(); extra.replaceChildren();
        const retry = node('button','Tentar novamente','condition-btn');
        retry.type = 'button'; retry.addEventListener('click', refreshCalendar);
        status.replaceChildren(document.createTextNode(error.message+' '),retry);
      }
    }
  }
  filters.addEventListener('submit', event => event.preventDefault());
  filters.addEventListener('change', event => {
    if (event.target === $('#seasonCulture')) {
      filters.elements.plantio.disabled = !event.target.value;
      filters.elements.plantio.value = '';
    }
    refreshCalendar();
  });
  refreshCalendar();
})();
