// Launch an isolated Chrome to check the local app on a desktop and mobile viewport.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp, realpath, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {basename, dirname, join} from 'node:path';

const [site = 'http://127.0.0.1:8000', screenshotPrefix] = process.argv.slice(2);
const profile = await mkdtemp(join(tmpdir(),'cereja-browser-'));
const proc = spawn(process.env.CHROME_BINARY || 'google-chrome', ['--headless=new','--no-first-run',
  '--disable-gpu','--remote-debugging-pipe','--user-data-dir='+profile,'about:blank'],
  {stdio:['ignore','ignore','inherit','pipe','pipe'],windowsHide:true});
const state = new Promise(resolve=>{proc.once('close',resolve);proc.once('error',resolve);});
let id = 0, sessionId, inbox = '';
const pending = new Map(), errors = [];
function receive(r) {
  if (r.method==='Runtime.exceptionThrown') errors.push(r.params.exceptionDetails.exception?.description ?? r.params.exceptionDetails.text);
  if (pending.has(r.id)) {
    const {resolve,reject}=pending.get(r.id); pending.delete(r.id);
    r.error ? reject(new Error(r.error.message)) : resolve(r.result);
  }
}
proc.stdio[4].setEncoding('utf8').on('data',chunk=>{
  inbox+=chunk;
  for (let i; (i=inbox.indexOf('\0'))>=0;) {
    const raw=inbox.slice(0,i); inbox=inbox.slice(i+1);
    if (raw) receive(JSON.parse(raw));
  }
});
proc.stdio[3].on('error',()=>{});
function run(method, params={}, browser=false) {
  return new Promise((resolve,reject)=>{
    const msg=++id;
    const timer=setTimeout(()=>{pending.delete(msg);reject(new Error('Chrome did not respond: '+method));},4000);
    pending.set(msg,{resolve:x=>{clearTimeout(timer);resolve(x);},reject:x=>{clearTimeout(timer);reject(x);}});
    proc.stdio[3].write(JSON.stringify({id:msg,method,params,sessionId:browser?undefined:sessionId})+'\0');
  });
}
async function page(expression) {
  const reply=await run('Runtime.evaluate',{expression,returnByValue:true});
  if (reply.exceptionDetails) throw new Error(reply.exceptionDetails.exception?.description ?? expression);
  return reply.result.value;
}
async function wait(expression) {
  for (let i=0; i<70; i++) {
    if (await page(expression)) return;
    await new Promise(r=>setTimeout(r,100));
  }
  throw new Error('Browser state not reached: '+expression+'; browser errors: '+JSON.stringify(errors));
}
async function screenshot(name) {
  if (!screenshotPrefix) return;
  const {data}=await run('Page.captureScreenshot',{format:'png'});
  await writeFile(screenshotPrefix+'-'+name+'.png',Buffer.from(data,'base64'));
}
const fill = (selector, value) => page(`{const el=document.querySelector(${JSON.stringify(selector)});el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('input',{bubbles:true}));}`);
try {
  const {targetId}=await run('Target.createTarget',{url:'about:blank'},true);
  ({sessionId}=await run('Target.attachToTarget',{targetId,flatten:true},true));
  await run('Runtime.enable'); await run('Page.enable');
  await run('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await run('Page.navigate',{url:site});
  await wait("document.querySelectorAll('.season-month').length === 12");
  assert.equal(await page("document.querySelector('.season-month').textContent"),'OUT');
  await page("document.querySelector('.season-panel').scrollIntoView({block:'start',behavior:'instant'}); document.querySelector('.season-bar').focus({preventScroll:true})");
  assert(await page("document.activeElement.classList.contains('season-bar')"));
  await run('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
  await run('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
  await wait("document.getElementById('ruleDialog').open === true");
  assert(await page("document.querySelector('#ruleDetails a').href.startsWith('https://')"));
  await screenshot('detalhes');
  await page("document.getElementById('ruleDialog').close()");
  await screenshot('calendario');

  await page("document.querySelector('#openMapBtn').click()");
  await wait("document.querySelector('#mapModal').getAttribute('aria-hidden') === 'false'");
  await page("document.querySelector('#confirmMapBtn').click()");
  await wait("document.querySelector('#diagnosticResult').textContent.includes('Malha de 5 km')");
  await page("document.querySelector('#recommendForm').requestSubmit()");
  await wait("document.querySelectorAll('#recommendResult .candidate-grid > li').length===10");
  await fill('#diagLat','0'); await fill('#diagLon','0');
  await page("document.querySelector('#farmForm').requestSubmit()");
  await wait("document.querySelector('#diagnosticResult').textContent.includes('indisponível para este ponto')");

  await run('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await page("document.querySelector('.season-panel').scrollIntoView({block:'start',behavior:'instant'})");
  assert(await page("document.documentElement.scrollWidth<=390"));
  const sticky=await page(`{const g=document.querySelector('#calendarScroll');const h=g.querySelector('.season-row-title');
    const x=h.getBoundingClientRect().left; g.scrollLeft=250;
    Math.abs(x-h.getBoundingClientRect().left)<2 && g.scrollLeft>0 && g.scrollWidth>g.clientWidth;}`);
  assert(sticky, 'Calendar scrolls horizontally and keeps the culture column pinned');
  await screenshot('celular');
  assert.deepEqual(errors, []);
  console.log('Browser: desktop and mobile calendar, keyboard dialog, map, diagnosis, candidates, outside-area state; no JavaScript exceptions.');
} finally {
  if (sessionId) await run('Browser.close',{},true).catch(()=>{});
  proc.kill();
  await state;
  const actual=await realpath(profile);
  if (dirname(actual)===(await realpath(tmpdir())) && basename(actual).startsWith('cereja-browser-')) {
    await rm(actual,{force:true,recursive:true,maxRetries:3,retryDelay:100});
  }
}
