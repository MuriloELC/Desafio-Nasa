(()=>{'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const layerData={casca:['Casca · a primeira proteção','A parte externa da cereja. Assim como ela, a cobertura do solo pode ser a primeira barreira contra o impacto da chuva e a exposição ao calor.'],polpa:['Polpa · reserva de nutrientes','A camada carnosa envolve as sementes. No cultivo, matéria orgânica e resíduos vegetais são parte importante da dinâmica de nutrientes e da estrutura do solo.'],mucilagem:['Mucilagem · o elo entre camadas','Uma camada natural que envolve o pergaminho. No CEREJÁ, ela inspira a conexão entre clima, água, solo e decisão de manejo.'],pergaminho:['Pergaminho · outra proteção','A camada fibrosa envolve as sementes. É uma lembrança de que sistemas resilientes contam com múltiplas barreiras de proteção.'],graos:['Grãos · o que queremos preservar','No centro da cereja estão as sementes. No centro do nosso propósito está a continuidade da cafeicultura diante da variabilidade climática.']};
let timeoutToast=0;
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(timeoutToast);timeoutToast=setTimeout(()=>el.classList.remove('show'),4500)}
function setLayer(layer){if(!layerData[layer])return;$$('.layer-pill').forEach(x=>x.classList.toggle('active',x.dataset.layer===layer));$$('.fruit-ring').forEach(x=>{x.classList.toggle('dim',x.dataset.layer!==layer);x.classList.toggle('selected',x.dataset.layer===layer)});$('#layerTitle').textContent=layerData[layer][0];$('#layerText').textContent=layerData[layer][1]}
$$('.layer-pill').forEach(btn=>btn.addEventListener('click',()=>setLayer(btn.dataset.layer)));$$('.fruit-ring').forEach(el=>el.addEventListener('click',()=>setLayer(el.dataset.layer)));setLayer('casca');
const strategyData={convencional:{title:'Manejo convencional',text:'Manejo da vegetação espontânea com roçagem conforme necessidade. A proteção do solo depende do volume de resíduos mantidos e da intensidade do manejo.',cover:['Variável',40],diversity:['Variável',34],carbon:['Limitado',32],protection:'Variável',erosion:'Depende da cobertura',water:'Variável',organic:'Menor aporte potencial',calendar:['Monitorar rebrota e roçar se necessário','Acompanhar crescimento da vegetação espontânea','Roçagem seletiva e manutenção de resíduos','Observar início da redução das chuvas','Preservar palhada existente','Evitar exposição do solo durante a estiagem','Monitorar cobertura residual','Evitar deixar o solo descoberto','Avaliar cobertura no retorno das chuvas','Monitorar rebrota e planejar roçagem','Manejo da vegetação espontânea','Manter resíduos sobre o solo']},permanente:{title:'Cobertura permanente',text:'Uma espécie de cobertura compatível com o café é manejada periodicamente para manter palhada. Exige atenção à competição hídrica, sobretudo em períodos secos.',cover:['Alto',76],diversity:['Moderada',52],carbon:['Moderado',65],protection:'Potencial alto',erosion:'Tende a reduzir',water:'Condicionado ao manejo',organic:'Potencial moderado',calendar:['Monitorar crescimento da cobertura','Roçar de acordo com a necessidade','Aproveitar resíduos como palhada','Planejar manejo antes da estiagem','Reduzir competição por água','Conservar palhada da roçagem','Monitorar umidade do solo','Manter resíduos e evitar competição','Avaliar recuperação após a seca','Monitorar rebrota com retorno das chuvas','Avaliar vigor da cobertura','Roçagem e manutenção de resíduos']},rotacao:{title:'Rotação de plantas de cobertura',text:'Alternar espécies compatíveis ao longo dos anos pode diversificar a biomassa e os sistemas radiculares. A seleção e o plantio devem respeitar chuva, espaçamento e demanda de água.',cover:['Alto',86],diversity:['Alta',92],carbon:['Alto',78],protection:'Potencial alto',erosion:'Tende a reduzir',water:'Potencial positivo',organic:'Potencial alto',calendar:['Acompanhar desenvolvimento da cobertura','Monitorar crescimento e competição hídrica','Avaliar roçagem e formação de palhada','Planejar manejo para a estiagem','Conservar palhada da cobertura anterior','Monitorar umidade e competição','Manter solo protegido com resíduos','Planejar próxima espécie da rotação','Preparar implantação conforme previsão','Avaliar início da semeadura','Monitorar estabelecimento','Acompanhar desenvolvimento da cobertura']}};
const strategySteps={
  convencional:[['Identificar','Vegetação espontânea adequada'],['Roçar','Controlar competição e infestantes'],['Proteger','Deixar palhada sobre o solo']],
  permanente:[['Avaliar','Braquiária ruziziensis e solo'],['Implantar','Apenas quando houver condições'],['Manejar','Roçar e manter a palhada']],
  rotacao:[['Ano 1','Crotalária-júncea'],['Ano 2','Milheto'],['Ano 3','Feijão-de-porco']]
};
function renderStrategySteps(key){$('#strategySteps').innerHTML=strategySteps[key].map((it,i)=>`<div class="timeline-step"><span class="circle">${i+1}</span><b>${it[0]}</b><small>${it[1]}</small></div>`).join('')}
const impactReadings={convencional:{soil:'Variável',water:'Variável',erosion:'Depende da cobertura',carbon:'Menor potencial',diversity:'Variável',title:'Proteger depende do manejo.',text:'A vegetação espontânea e a palhada remanescente podem proteger o solo. Roçagens muito intensas ou solo descoberto aumentam a exposição e o risco de erosão.'},permanente:{soil:'Potencial alto',water:'Depende da roçagem',erosion:'Pode diminuir',carbon:'Moderado',diversity:'Baixa a moderada',title:'Cobertura constante, cuidado contínuo.',text:'A cobertura cultivada pode proteger contra o impacto da chuva e fornecer resíduos. É preciso manejar a competição por água e nutrientes com o cafeeiro.'},rotacao:{soil:'Potencial alto',water:'Condicionado ao manejo',erosion:'Pode diminuir',carbon:'Potencial alto',diversity:'Alta',title:'Diversidade para cuidar do solo.',text:'Alternar espécies de cobertura pode ampliar a diversidade de resíduos e raízes. A escolha e a época de implantação devem respeitar a disponibilidade hídrica.'}};
function updateImpact(next){const i=impactReadings[next];$('#envSoil').textContent=i.soil;$('#envWater').textContent=i.water;$('#envErosion').textContent=i.erosion;$('#envCarbon').textContent=i.carbon;$('#envDiversity').textContent=i.diversity;$('#impactStoryTitle').textContent=i.title;$('#impactStoryText').textContent=i.text;$$('.impact-choice').forEach(b=>{b.classList.toggle('active',b.dataset.impactStrategy===next);b.setAttribute('aria-pressed',String(b.dataset.impactStrategy===next))})}

const examples = {
  convencional: 'Vegetação espontânea com roçagem seletiva',
  permanente: 'Exemplo: capim ou leguminosa perene',
  rotacao: 'Exemplo: alternar gramíneas e leguminosas'
};
function updateStrategy(next) {
  const d = strategyData[next];
  for (const btn of $$('.strategy-card, .impact-choice')) {
    const active = (btn.dataset.strategy || btn.dataset.impactStrategy) === next;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  }
  for (const [id,value] of Object.entries({
    strategyTitle:d.title, strategyText:d.text, impactProtection:d.protection,
    impactErosion:d.erosion, impactWater:d.water, impactOrganic:d.organic,
    impactCoverPlan:examples[next]
  })) document.getElementById(id).textContent = value;
  updateImpact(next);
  renderStrategySteps(next);
}
$$('.strategy-card, .impact-choice').forEach(btn => btn.addEventListener('click', () =>
  updateStrategy(btn.dataset.strategy || btn.dataset.impactStrategy)));
updateStrategy('rotacao');

$('#menuBtn').addEventListener('click',()=>{const nav=$('#mainNav');const opened=nav.classList.toggle('open');$('#menuBtn').setAttribute('aria-expanded',String(opened))});$$('#mainNav a').forEach(a=>a.addEventListener('click',()=>{$('#mainNav').classList.remove('open');$('#menuBtn').setAttribute('aria-expanded','false')}));
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}}),{threshold:.09});$$('.fade').forEach(el=>observer.observe(el))}else{$$('.fade').forEach(el=>el.classList.add('visible'))}
const cities = {cacoal:{name:'Cacoal', lat:-11.4386, lon:-61.4472}};
let tilesEnabled = false;
let mapView={lat:-11.4386,lon:-61.4472,zoom:11},pendingPoint={lat:-11.4386,lon:-61.4472};
const tileCache=new Map();let mapVisible=false,mapCanvas=null,ctx=null,canvasW=0,canvasH=0,mapPointer=null,loadedTiles=0;
const rad=Math.PI/180,clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
function lngLatPixel(lat,lon,z){const world=256*Math.pow(2,z),phi=clamp(lat,-85.05,85.05)*rad;return {x:(lon+180)/360*world,y:(1-Math.asinh(Math.tan(phi))/Math.PI)/2*world}}
function pixelLngLat(x,y,z){const world=256*Math.pow(2,z);return {lon:((x%world+world)%world)/world*360-180,lat:Math.atan(Math.sinh(Math.PI*(1-2*y/world)))/rad}}
function screenPixel(lat,lon){const c=lngLatPixel(mapView.lat,mapView.lon,mapView.zoom),p=lngLatPixel(lat,lon,mapView.zoom);return {x:p.x-c.x+canvasW/2,y:p.y-c.y+canvasH/2}}
function pointOnMap(x,y){const c=lngLatPixel(mapView.lat,mapView.lon,mapView.zoom);return pixelLngLat(c.x+x-canvasW/2,c.y+y-canvasH/2,mapView.zoom)}
function drawMap(){if(!mapVisible||!mapCanvas)return;const rect=mapCanvas.getBoundingClientRect();if(rect.width<20)return;const dpr=Math.min(window.devicePixelRatio||1,2);canvasW=rect.width;canvasH=rect.height;mapCanvas.width=Math.ceil(canvasW*dpr);mapCanvas.height=Math.ceil(canvasH*dpr);ctx=mapCanvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,canvasW,canvasH);const g=ctx.createLinearGradient(0,0,canvasW,canvasH);g.addColorStop(0,'#e0ebdb');g.addColorStop(1,'#c6d9b9');ctx.fillStyle=g;ctx.fillRect(0,0,canvasW,canvasH);
// Fallback offline: grade geográfica real + cidades conhecidas. Não simula estradas ou limites oficiais.
ctx.strokeStyle='rgba(51,104,74,.18)';ctx.lineWidth=1;for(let lon=-70;lon<=-55;lon+=.5){const x=screenPixel(mapView.lat,lon).x;if(x<0||x>canvasW)continue;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvasH);ctx.stroke();ctx.fillStyle='#56765e';ctx.font='10px system-ui';ctx.fillText(Math.abs(lon).toFixed(1)+'°O',x+4,canvasH-22)}for(let lat=-20;lat<=0;lat+=.5){const y=screenPixel(lat,mapView.lon).y;if(y<0||y>canvasH)continue;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvasW,y);ctx.stroke();ctx.fillStyle='#56765e';ctx.font='10px system-ui';ctx.fillText(Math.abs(lat).toFixed(1)+'°S',12,y-4)}
// Camada de ruas e terrenos de OpenStreetMap: quando a internet estiver disponível.
const world=256*Math.pow(2,mapView.zoom),c=lngLatPixel(mapView.lat,mapView.lon,mapView.zoom),left=c.x-canvasW/2,top=c.y-canvasH/2;let drawCount=0;if(tilesEnabled)for(let tx=Math.floor(left/256);tx<=Math.floor((left+canvasW)/256);tx++){for(let ty=Math.floor(top/256);ty<=Math.floor((top+canvasH)/256);ty++){const xx=((tx%Math.pow(2,mapView.zoom))+Math.pow(2,mapView.zoom))%Math.pow(2,mapView.zoom),key=mapView.zoom+'/'+xx+'/'+ty;let entry=tileCache.get(key);if(!entry){entry={state:'loading'};tileCache.set(key,entry);const img=new Image();img.onload=()=>{entry.img=img;entry.state='loaded';if(mapVisible)drawMap()};img.onerror=()=>{entry.state='unavailable';if(mapVisible)$('#mapBaseInfo').textContent='Grade geográfica offline · selecione um ponto ou digite as coordenadas'};img.referrerPolicy='strict-origin-when-cross-origin';img.src='https://tile.openstreetmap.org/'+key+'.png'}if(entry.state==='loaded'){ctx.drawImage(entry.img,tx*256-left,ty*256-top,256,256);drawCount++}}}
if(tileCache.size>150){for(const k of tileCache.keys()){if(tileCache.size<=100)break;tileCache.delete(k)}}
$('#mapBaseInfo').textContent=drawCount?'Mapa © OpenStreetMap contributors · seleção de coordenadas':'Grade geográfica offline · mapa com ruas requer internet';
// Referências de municípios (coordenadas aproximadas)
Object.values(cities).forEach(city=>{const p=screenPixel(city.lat,city.lon);if(p.x<0||p.y<0||p.x>canvasW||p.y>canvasH)return;ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fillStyle='#bc533c';ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='#fff';ctx.stroke();ctx.font='bold 11px system-ui';ctx.lineWidth=3;ctx.strokeStyle='rgba(255,255,255,.92)';ctx.strokeText(city.name,p.x+8,p.y-9);ctx.fillStyle='#2b4635';ctx.fillText(city.name,p.x+8,p.y-9)});
// Alfinete de seleção
const p=screenPixel(pendingPoint.lat,pendingPoint.lon);if(p.x>-30&&p.x<canvasW+30&&p.y>-40&&p.y<canvasH+40){ctx.beginPath();ctx.arc(p.x,p.y,18,0,Math.PI*2);ctx.fillStyle='rgba(185,60,43,.17)';ctx.fill();ctx.beginPath();ctx.arc(p.x,p.y,8,0,Math.PI*2);ctx.fillStyle='#b73d2e';ctx.fill();ctx.strokeStyle='white';ctx.lineWidth=3;ctx.stroke();ctx.beginPath();ctx.moveTo(p.x,p.y+8);ctx.lineTo(p.x,p.y+20);ctx.strokeStyle='#b73d2e';ctx.lineWidth=3;ctx.stroke()}}

function setPending(lat, lon, _, recenter=false) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat)>85 || Math.abs(lon)>180) return;
  pendingPoint={lat,lon};
  if (recenter) mapView={...mapView,lat,lon};
  $('#mapLat').value=lat.toFixed(5); $('#mapLon').value=lon.toFixed(5);
  $('#mapPinInfo').textContent='⌖ '+lat.toFixed(5)+', '+lon.toFixed(5);
  drawMap();
}
function openMap() {
  const modal=$('#mapModal');
  mapVisible=true; modal.classList.add('open'); modal.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
  const lat=$('#diagLat').value, lon=$('#diagLon').value;
  const source=lat && lon && Math.abs(+lat)<=85 && Math.abs(+lon)<=180 ? {lat:+lat,lon:+lon} : cities.cacoal;
  setPending(source.lat,source.lon,null,true);
  $('#closeMapBtn').focus();
}
function closeMap() {
  mapVisible=false; $('#mapModal').classList.remove('open'); $('#mapModal').setAttribute('aria-hidden','true');
  document.body.style.overflow=''; $('#openMapBtn').focus();
}
function confirmMap() {
  const a=$('#mapLat').value, b=$('#mapLon').value;
  if (!a || !b || Math.abs(+a)>85 || Math.abs(+b)>180) { toast('Digite latitude e longitude válidas.'); return; }
  $('#diagLat').value = a; $('#diagLon').value = b;
  closeMap(); $('#farmForm').requestSubmit();
}
$('#mapHome').addEventListener('click',()=>setPending(cities.cacoal.lat,cities.cacoal.lon,null,true));
$('#mapTiles').addEventListener('click',e=>{
  tilesEnabled=!tilesEnabled; e.currentTarget.setAttribute('aria-pressed',String(tilesEnabled));
  e.currentTarget.textContent=tilesEnabled?'Desativar mapa de ruas':'Ativar mapa de ruas'; drawMap();
});
document.addEventListener('keydown', e => {
  if (!mapVisible || e.key!=='Tab') return;
  const items=[...$('#mapModal').querySelectorAll('button,input,a[href]')], first=items[0], last=items.at(-1);
  if (e.shiftKey && document.activeElement===first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement===last) { e.preventDefault(); first.focus(); }
});

$('#openMapBtn').addEventListener('click',openMap);$('#closeMapBtn').addEventListener('click',closeMap);$('#cancelMapBtn').addEventListener('click',closeMap);$('#confirmMapBtn').addEventListener('click',confirmMap);$('#mapModal').addEventListener('click',e=>{if(e.target===$('#mapModal'))closeMap()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mapVisible)closeMap()});
$('#mapZoomIn').addEventListener('click',()=>{mapView.zoom=Math.min(14,mapView.zoom+1);drawMap()});$('#mapZoomOut').addEventListener('click',()=>{mapView.zoom=Math.max(5,mapView.zoom-1);drawMap()});
mapCanvas=$('#propertyMap');mapCanvas.addEventListener('pointerdown',e=>{mapPointer={id:e.pointerId,x:e.clientX,y:e.clientY,origin:{...mapView},moved:false};mapCanvas.setPointerCapture(e.pointerId)});mapCanvas.addEventListener('pointermove',e=>{if(!mapPointer||mapPointer.id!==e.pointerId)return;const dx=e.clientX-mapPointer.x,dy=e.clientY-mapPointer.y;if(Math.hypot(dx,dy)>5)mapPointer.moved=true;if(mapPointer.moved){const start=lngLatPixel(mapPointer.origin.lat,mapPointer.origin.lon,mapView.zoom);const pos=pixelLngLat(start.x-dx,start.y-dy,mapView.zoom);mapView.lat=pos.lat;mapView.lon=pos.lon;drawMap()}});mapCanvas.addEventListener('pointerup',e=>{if(!mapPointer)return;if(!mapPointer.moved){const rect=mapCanvas.getBoundingClientRect(),p=pointOnMap(e.clientX-rect.left,e.clientY-rect.top);setPending(p.lat,p.lon,null)}mapPointer=null});mapCanvas.addEventListener('pointercancel',()=>{mapPointer=null});mapCanvas.addEventListener('wheel',e=>{if(!mapVisible)return;e.preventDefault();mapView.zoom=clamp(mapView.zoom+(e.deltaY<0?1:-1),5,14);drawMap()},{passive:false});
['mapLat','mapLon'].forEach(id=>$('#'+id).addEventListener('change',()=>{const lat=Number($('#mapLat').value),lon=Number($('#mapLon').value);if(Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=85&&Math.abs(lon)<=180)setPending(lat,lon,null,true)}));window.addEventListener('resize',()=>{if(mapVisible)drawMap()});
})();
