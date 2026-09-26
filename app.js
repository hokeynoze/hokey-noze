const SIZES=[212,221,230,238,246,254,263,272,280,288,296,306];
const HEIGHTS=Array.from({length:61},(_,i)=>(17+i/10).toFixed(1));
const STATUSES=['Aktuálne','Predané','Na ceste'];
const BRANDS=['Bauer','CCM','True','Ramonedge','Iné'];

const TYPE_LIBRARY={
  Bauer:[
    'FLY-TI','FLY-X','LS Pulse TI','LS Pulse','LS CarbonLite','LS5 Carbon','LS5 Pro','LS5','LS4','LS3','LS2',
    'TUUK Lightspeed Edge','TUUK Lightspeed 2','GOALIE Vertex Edge'
  ],
  CCM:[
    'STEP BlackSteel XS','STEP V-Steel XS','STEP Steel XS','SpeedBlade XS Stainless Steel',
    'STEP BlackSteel SB +4.0','STEP Steel SB +4.0','STEP Steel XS PairG 3mm Goalie'
  ],
  True:[
    'Shift Max'
  ],
  Ramonedge:[
    'RamonEdge – Bauer PowerFly','RamonEdge – Bauer TUUK Lightspeed Edge',
    'RamonEdge – Bauer GOALIE Vertex Edge','RamonEdge – CCM SpeedBlade XS','RamonEdge – True Shift Max'
  ],
  Iné:[]
};

const $=id=>document.getElementById(id);
let currentFilter='Všetko',items=[],sb=null,currentShipId=null,selectedCarrier='';
let deferredInstallPrompt=null;

function money(v){return (Number(v)||0).toFixed(0)+' €'}
function nextCode(){let max=0;items.forEach(x=>{let m=String(x.kod||'').match(/N(\d+)/i);if(m)max=Math.max(max,+m[1])});return 'N'+String(max+1).padStart(3,'0')}
function esc(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}

function typeKey(brand,type){return `${brand}|||${type}`}
function getCounts(){
  const c={};
  items.forEach(x=>{const k=typeKey(x.znacka,x.model);c[k]=(c[k]||0)+1});
  return c;
}
function getTypesForBrand(brand){
  const counts=getCounts();
  const existing=[...new Set(items.filter(x=>x.znacka===brand&&x.model).map(x=>x.model))];
  const base=[...(TYPE_LIBRARY[brand]||[])];
  const all=[...new Set([...base,...existing])];
  all.sort((a,b)=>(counts[typeKey(brand,b)]||0)-(counts[typeKey(brand,a)]||0)||a.localeCompare(b,'sk'));
  return all;
}
function fillTypeSelect(preferred=''){
  const brand=$('znacka').value;
  const sel=$('typ'); sel.innerHTML='';
  const types=getTypesForBrand(brand);
  const counts=getCounts();
  types.forEach(t=>sel.add(new Option(`${t}${counts[typeKey(brand,t)]?' · '+counts[typeKey(brand,t)]+'×':''}`,t)));
  sel.add(new Option('＋ Vlastný typ…','__custom__'));
  if(preferred && types.includes(preferred)) sel.value=preferred;
  else sel.value=types[0]||'__custom__';
  $('customModelWrap').classList.toggle('hidden',sel.value!=='__custom__');
}
function fillSelects(){
  SIZES.forEach(v=>$('velkost').add(new Option(v,v)));
  HEIGHTS.forEach(v=>$('vyska').add(new Option(v+' mm',v)));
  $('vyska').value='20.0';
  fillTypeSelect();
}
function clearForm(){
  ['nakup','predaj','moc','poznamka','customModel'].forEach(id=>$(id).value='');
  $('stav').value='Aktuálne';$('znacka').value='Bauer';$('velkost').value='212';$('vyska').value='20.0';
  fillTypeSelect();
}
async function loadItems(){
  const {data,error}=await sb.from('knives').select('*').order('created_at',{ascending:false});
  if(error){alert('Chyba databázy: '+error.message);return}
  items=data||[];render();fillTypeSelect($('typ')?.value);
}
function currentModel(){
  return $('typ').value==='__custom__'?$('customModel').value.trim():$('typ').value;
}
async function addItem(){
  const model=currentModel();
  if(!model){alert('Vyber alebo zadaj typ noža.');return}
  const item={kod:nextCode(),znacka:$('znacka').value,model,velkost:$('velkost').value,vyska:$('vyska').value,stav:$('stav').value,nakup:+$('nakup').value||0,predaj:+$('predaj').value||0,moc:+$('moc').value||0,poznamka:$('poznamka').value.trim()};
  const {error}=await sb.from('knives').insert(item);
  if(error){alert(error.message);return}
  clearForm();await loadItems();
}
function sel(arr,val,idx,key,suffix=''){
  return `<select data-i="${idx}" data-k="${key}">${arr.map(v=>`<option value="${esc(v)}" ${String(v)==String(val)?'selected':''}>${esc(v)}${suffix}</option>`).join('')}</select>`
}
function carrierSummary(x){
  const s=x.shipping||{};
  if(!s.carrier) return `<button class="shipBtn" data-ship="${x.id}">📦 Odoslať</button>`;
  const icon=s.carrier==='Packeta'?'P':'✉';
  return `<button class="shipBtn shipped" data-ship="${x.id}">${icon} ${esc(s.carrier)}<small>${esc(s.status||'')}</small></button>`;
}
function render(){
 const q=$('search').value.toLowerCase(),brand=$('brandFilter').value;
 const f=items.filter(x=>(currentFilter==='Všetko'||x.stav===currentFilter)&&(brand==='Všetky značky'||x.znacka===brand)&&[x.kod,x.znacka,x.model,x.velkost,x.vyska,x.poznamka].join(' ').toLowerCase().includes(q));
 $('tbody').innerHTML='';$('empty').style.display=f.length?'none':'block';
 f.forEach(x=>{
   const i=items.indexOf(x),p=(+x.predaj||0)-(+x.nakup||0),tr=document.createElement('tr');
   tr.innerHTML=`<td><input class="code" value="${esc(x.kod)}" data-i="${i}" data-k="kod"></td>
   <td><div class="knifeName"><b>${esc(x.znacka)}</b><span>${esc(x.model)}</span></div></td>
   <td>${sel(SIZES,x.velkost,i,'velkost')}</td><td>${sel(HEIGHTS,x.vyska,i,'vyska',' mm')}</td><td>${sel(STATUSES,x.stav,i,'stav')}</td>
   <td><input type="number" value="${x.nakup||0}" data-i="${i}" data-k="nakup"></td><td><input type="number" value="${x.predaj||0}" data-i="${i}" data-k="predaj"></td>
   <td class="${p>=0?'profitPlus':'profitMinus'}">${money(p)}</td><td><input type="number" value="${x.moc||0}" data-i="${i}" data-k="moc"></td>
   <td><input value="${esc(x.poznamka)}" data-i="${i}" data-k="poznamka"></td><td>${carrierSummary(x)}</td>
   <td><button class="delete" data-del="${i}">Zmazať</button></td>`;
   $('tbody').appendChild(tr)
 });
 bind();stats();
}
function bind(){
 document.querySelectorAll('[data-k]').forEach(el=>el.onchange=async e=>{
   const i=+e.target.dataset.i,k=e.target.dataset.k,v=['nakup','predaj','moc'].includes(k)?(+e.target.value||0):e.target.value;
   const {error}=await sb.from('knives').update({[k]:v}).eq('id',items[i].id);if(error)alert(error.message);else await loadItems();
 });
 document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async e=>{
   if(confirm('Naozaj zmazať tento nôž?')){const {error}=await sb.from('knives').delete().eq('id',items[+e.target.dataset.del].id);if(error)alert(error.message);else await loadItems()}
 });
 document.querySelectorAll('[data-ship]').forEach(b=>b.onclick=()=>openShip(b.dataset.ship));
}
function stats(){
 const a=items.filter(x=>x.stav==='Aktuálne'),p=items.filter(x=>x.stav==='Predané'),c=items.filter(x=>x.stav==='Na ceste');
 $('countAktualne').textContent=a.length;$('countPredane').textContent=p.length;$('countCesta').textContent=c.length;
 $('tabAll').textContent=items.length;$('tabStock').textContent=a.length;$('tabRoad').textContent=c.length;$('tabSold').textContent=p.length;
 let sn=0,sp=0;items.forEach(x=>{sn+=+x.nakup||0;sp+=+x.predaj||0});
 $('sumNakup').textContent=money(sn);$('sumPredaj').textContent=money(sp);$('sumProfit').textContent=money(sp-sn)
}
async function openShip(id){
 const x=items.find(v=>v.id===id);if(!x)return;
 currentShipId=id;const s=x.shipping||{};
 $('shipKnife').textContent=`${x.kod} · ${x.znacka} · ${x.model}`;
 $('shipName').value=s.name||'';$('shipPhone').value=s.phone||'';$('shipEmail').value=s.email||'';
 $('shipAddress').value=s.address||'';$('shipCod').value=s.cod??(x.predaj||'');$('shipTracking').value=s.tracking||'';
 $('shipStatus').value=s.status||'Pripravené';$('shipDate').value=s.date||'';
 selectedCarrier=s.carrier||'';
 document.querySelectorAll('.carrierBtn').forEach(b=>b.classList.toggle('selected',b.dataset.carrier===selectedCarrier));
 $('shipResult').textContent=s.carrier?`Aktuálne: ${s.carrier} · ${s.status||'Pripravené'}${s.tracking?' · '+s.tracking:''}`:'Vyber dopravcu.';
 $('shipModal').classList.remove('hidden');
}
async function saveShip(){
 if(!currentShipId)return;
 if(!selectedCarrier){alert('Vyber Packeta alebo Slovenskú poštu.');return}
 const shipping={carrier:selectedCarrier,name:$('shipName').value.trim(),phone:$('shipPhone').value.trim(),email:$('shipEmail').value.trim(),address:$('shipAddress').value.trim(),cod:+$('shipCod').value||0,tracking:$('shipTracking').value.trim(),status:$('shipStatus').value,date:$('shipDate').value};
 const {error}=await sb.from('knives').update({shipping,stav:$('shipStatus').value==='Odoslané'?'Na ceste':items.find(x=>x.id===currentShipId).stav}).eq('id',currentShipId);
 if(error){alert(error.message);return}
 $('shipResult').textContent=`Uložené: ${selectedCarrier} · ${shipping.status}${shipping.tracking?' · '+shipping.tracking:''}`;
 await loadItems();
}
async function login(){const {error}=await sb.auth.signInWithPassword({email:$('email').value,password:$('password').value});if(error)$('loginMsg').textContent=error.message}
async function signup(){const {error}=await sb.auth.signUp({email:$('email').value,password:$('password').value});if(error)$('loginMsg').textContent=error.message;else $('loginMsg').textContent='Účet vytvorený. Skontroluj e-mail, ak je potvrdenie zapnuté.'}
async function boot(){
 if(!window.SUPABASE_URL||!window.SUPABASE_KEY){$('loginMsg').textContent='Najprv nastav SUPABASE_URL a SUPABASE_KEY v index.html.';return}
 sb=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_KEY);
 const {data:{session}}=await sb.auth.getSession();if(session)showApp(session);else $('login').classList.remove('hidden');
 sb.auth.onAuthStateChange((_e,s)=>{if(s)showApp(s);else{$('app').classList.add('hidden');$('login').classList.remove('hidden')}});
}
async function showApp(session){$('login').classList.add('hidden');$('app').classList.remove('hidden');$('userEmail').textContent=session.user.email||'';if(!$('velkost').options.length)fillSelects();await loadItems()}
function setupInstall(){
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;$('installBtn').classList.remove('hidden')});
 $('installBtn').onclick=async()=>{
   if(!deferredInstallPrompt){alert('Ak tlačidlo nie je podporované, v Chrome/Safari zvoľ „Pridať na plochu“ alebo „Inštalovať aplikáciu“.');return}
   deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$('installBtn').classList.add('hidden');
 };
 window.addEventListener('appinstalled',()=>{$('installBtn').classList.add('hidden')});
}
document.addEventListener('DOMContentLoaded',()=>{
 $('loginBtn').onclick=login;$('signupBtn').onclick=signup;$('addBtn').onclick=addItem;$('clearBtn').onclick=clearForm;$('refreshBtn').onclick=loadItems;
 $('logoutBtn').onclick=()=>sb.auth.signOut();$('search').oninput=render;$('brandFilter').onchange=render;$('znacka').onchange=()=>fillTypeSelect();
 $('typ').onchange=()=>{$('customModelWrap').classList.toggle('hidden',$('typ').value!=='__custom__')};
 $('shipClose').onclick=()=>$('shipModal').classList.add('hidden');
 document.querySelectorAll('.carrierBtn').forEach(b=>b.onclick=()=>{selectedCarrier=b.dataset.carrier;document.querySelectorAll('.carrierBtn').forEach(x=>x.classList.toggle('selected',x===b))});
 $('shipSave').onclick=saveShip;
 document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentFilter=b.dataset.filter;render()});
 setupInstall();boot();
});
