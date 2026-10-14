import {planSavings} from './model.mjs';
const $=id=>document.getElementById(id);
const money=n=>`$${n.toLocaleString('en-US')}`;
let quote=null;
const defaults={goal:'30',target:30,owned:0,balance:3500000,reserve:1000000};
const ids=Object.keys(defaults);
function showNotice(message){$('notice').textContent=message;$('notice').hidden=false;}
function clearResults(){for(const id of ['affordable','remaining','cost','after','shortfall','progress-label'])$(id).textContent='—';$('progress').value=0;}
function calculate(){
  $('custom-goal').hidden=$('goal').value!=='custom';
  $('target').required=$('goal').value==='custom';
  if(!quote)return;
  if(!$('planner-form').checkValidity()){clearResults();$('result-summary').textContent='Enter valid whole-number balances to calculate your plan.';return;}
  try{
    const targetBars=Number($('goal').value==='custom'?$('target').value:$('goal').value);
    const p=planSavings({targetBars,ownedBars:Number($('owned').value),cash:Number($('balance').value),reserve:Number($('reserve').value),price:quote.price});
    $('affordable').textContent=p.affordableBars;
    $('remaining').textContent=p.remainingBars;
    $('cost').textContent=money(p.cost);
    $('after').textContent=money(p.cashAfter);
    $('shortfall').textContent=money(p.shortfall);
    $('progress-label').textContent=`${p.progress.toFixed(0)}%`;$('progress').value=p.progress;
    $('result-title').textContent=p.remainingBars===0?'Your gold goal is covered':p.shortfall===0?'Your goal is within reach':'Build toward your goal';
    $('result-summary').textContent=p.remainingBars===0?'You already have enough bars for this goal.':`Buy up to ${p.affordableBars} bars for ${money(p.purchaseCost)}, leaving ${money(p.cashAfter)} in cash. ${Number($('balance').value)<Number($('reserve').value)?'Your balance is already below your reserve.':'Your gameplay reserve stays intact.'}`;
    try{localStorage.setItem('wardogs-gold-plan-v1',JSON.stringify(Object.fromEntries(ids.map(id=>[id,$(id).value]))));}catch{$('saved').textContent='Browser storage is unavailable; this plan will not be saved.';}
  }catch{clearResults();$('result-summary').textContent='Check your values. Use non-negative whole numbers within the displayed limits.';}
}
try{const saved=JSON.parse(localStorage.getItem('wardogs-gold-plan-v1')??'null');if(saved)for(const id of ids)if(saved[id]!=null)$(id).value=saved[id];}catch{}
$('planner-form').addEventListener('input',calculate);
$('planner-form').addEventListener('change',calculate);
$('planner-form').addEventListener('submit',event=>{event.preventDefault();calculate();});
$('reset').addEventListener('click',()=>{for(const [id,value]of Object.entries(defaults))$(id).value=value;try{localStorage.removeItem('wardogs-gold-plan-v1');}catch{}calculate();});
calculate();
try{
  const response=await fetch('./current-price.json',{cache:'no-store'});
  if(!response.ok)throw new Error('The latest published quote could not be loaded.');
  const data=await response.json();
  if(!Number.isSafeInteger(data.price)||data.price<=0||!/^\d{4}-\d{2}-\d{2}$/.test(data.quote_date))throw new Error('The published quote is invalid.');
  $('rate').textContent=money(data.price);$('quote-date').textContent=`Quote: ${data.quote_date} UTC`;
  if(data.quote_date!==new Date().toISOString().slice(0,10))throw new Error(`This quote is dated ${data.quote_date} UTC. Calculations are paused until today's quote is published.`);
  quote=data;$('assessment').textContent=`Recent rate: ${data.assessment??'Unavailable'}`;calculate();
}catch(error){showNotice(error.message);$('planner-form').querySelector('button[type=submit]').disabled=true;$('result-summary').textContent='Waiting for a fresh published quote. Your preferences can still be edited.';}
setInterval(()=>{
  if(quote && quote.quote_date!==new Date().toISOString().slice(0,10)){
    quote=null;clearResults();showNotice('A new UTC day has started. Reload after the daily quote is published.');
    $('planner-form').querySelector('button[type=submit]').disabled=true;
    $('result-summary').textContent='Waiting for today’s published quote.';
  }
},60000);
