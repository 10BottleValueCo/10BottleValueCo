import { useEffect, useRef, useState } from 'react';
import './OperationsDiscounts.css';

export function discountStatus(discount, now = Date.now()) {
  if (discount.used) return 'used';
  if (!discount.active) return 'inactive';
  if (discount.endsAt && Date.parse(discount.endsAt) <= now) return 'expired';
  if (discount.startsAt && Date.parse(discount.startsAt) > now) return 'scheduled';
  return 'active';
}
const blank = () => ({id:null,revision:null,code:'',title:'',percentage:'5',audience:'public',email:'',minimumSubtotal:'0',active:true,startsAt:'',endsAt:''});
const localDate = iso => { if (!iso) return ''; const d = new Date(iso); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16); };
const words = {
  en: { title:'Promo codes & discounts', subtitle:'Create a code, choose who can use it, and set its active dates.', create:'Create discount', search:'Search codes or customers', all:'All', active:'Active', scheduled:'Scheduled', expired:'Expired', inactive:'Inactive', used:'Used', code:'Code', value:'Discount', customer:'Customer eligibility', public:'Everyone with the code', personal:'One customer', minimum:'Minimum product subtotal (USD)', period:'Active dates', edit:'Edit', duplicate:'Duplicate', titleLabel:'Internal title (optional)', percentage:'Percentage off products', starts:'Starts', ends:'Ends', scheduleHint:'Dates use your local time zone:', noStart:'Immediately', noEnd:'No end date', activeLabel:'Enable this discount', save:'Save discount', saving:'Saving…', cancel:'Cancel', loading:'Loading discounts…', retry:'Refresh', empty:'No matching codes in the loaded records.', next:'Load more', saved:'Discount saved.', unavailable:'Discounts could not be loaded. Refresh to retry.', changed:'This code changed or is reserved by a payment. Refresh before editing.', auth:'Sign in with your authorized administrator account.', loaded:'records loaded', customerEmail:'Customer email', invalid:'Check the fields and active dates.', percentHint:'Applied to products before shipping and payment adjustments.', history:'Changes affect new payments. Started payments keep their original quote.', identity:'The code and customer stay fixed after creation. Duplicate to issue a different code.', usage:'Public codes have no use limit. Personal codes are assigned to one customer and become unavailable when marked used.', combinations:'One promo code per order; it replaces the bulk or referral discount. The existing crypto payment adjustment remains separate.', builtin:'Existing automatic discounts', builtinText:'Bulk order tiers: 10% from $1,000, 15% from $2,000, 20% from $4,000. REVIEW10 and the owner’s shipping override remain existing built-in rules.', status:'Status', off:'off', formTitle:'Discount details', source:'Saved rules • USD • percentage of product subtotal', historySource:'Every Operations rule change is recorded in private change history.', noMatches:'Clear the filter or load more records.' },
  ru: { title:'Промокоды и скидки', subtitle:'Создайте код, выберите получателей и задайте срок действия.', create:'Создать скидку', search:'Поиск по коду или клиенту', all:'Все', active:'Активные', scheduled:'Запланированные', expired:'Истёкшие', inactive:'Отключённые', used:'Использованные', code:'Код', value:'Скидка', customer:'Кому доступна', public:'Всем, у кого есть код', personal:'Одному клиенту', minimum:'Минимальная сумма товаров (USD)', period:'Срок действия', edit:'Изменить', duplicate:'Дублировать', titleLabel:'Внутреннее название (необязательно)', percentage:'Скидка на товары, %', starts:'Начало', ends:'Окончание', scheduleHint:'Даты указаны в вашем часовом поясе:', noStart:'Сразу', noEnd:'Без окончания', activeLabel:'Включить эту скидку', save:'Сохранить скидку', saving:'Сохраняем…', cancel:'Отмена', loading:'Загружаем скидки…', retry:'Обновить', empty:'В загруженных записях подходящих кодов нет.', next:'Загрузить ещё', saved:'Скидка сохранена.', unavailable:'Не удалось загрузить скидки. Обновите для повтора.', changed:'Код изменён или зарезервирован платежом. Обновите перед редактированием.', auth:'Войдите под разрешённым администратором.', loaded:'записей загружено', customerEmail:'Email клиента', invalid:'Проверьте поля и срок действия.', percentHint:'Применяется к товарам до доставки и платёжных корректировок.', history:'Изменения действуют для новых платежей. Начатые платежи сохраняют исходный расчёт.', identity:'После создания код и клиент не меняются. Для другого кода используйте дублирование.', usage:'Общие коды без лимита использований. Персональный код доступен одному клиенту и отключается после отметки об использовании.', combinations:'Один промокод на заказ; он заменяет оптовую или партнёрскую скидку. Действующая скидка за оплату криптовалютой учитывается отдельно.', builtin:'Действующие автоматические скидки', builtinText:'Оптовые пороги: 10% от $1 000, 15% от $2 000, 20% от $4 000. REVIEW10 и бесплатная доставка владельца остаются встроенными правилами.', status:'Статус', off:'скидка', formTitle:'Параметры скидки', source:'Сохранённые правила • USD • процент от суммы товаров', historySource:'Каждое изменение правил через Operations записывается в закрытую историю.', noMatches:'Сбросьте фильтр или загрузите ещё записи.' },
};

export default function OperationsDiscounts({supabase,expectedEmail,language='en',fetcher=fetch}) {
  const t = words[language] || words.en;
  const [rows,setRows]=useState([]), [state,setState]=useState('loading'), [notice,setNotice]=useState('');
  const [page,setPage]=useState(0), [hasMore,setHasMore]=useState(false), [filter,setFilter]=useState('all'), [search,setSearch]=useState('');
  const [form,setForm]=useState(null), [saving,setSaving]=useState(false);
  const version=useRef(0), saveLock=useRef(false), controller=useRef(null);
  const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
  async function request(method, body, offset=0) {
    const {data,error}=await supabase.auth.getSession();
    const session=data?.session;
    if(error || !session?.access_token || String(session.user?.email || '').trim().toLowerCase()!==expectedEmail.trim().toLowerCase()) throw Object.assign(new Error(),{status:401});
    const response=await fetcher(`/api/admin-discounts${method==='GET'?`?page=${offset}`:''}`,{method,headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},cache:'no-store',signal:controller.current?.signal,...(body?{body:JSON.stringify(body)}:{})});
    const result=await response.json();
    if(!response.ok || result.ok!==true) throw Object.assign(new Error(),{status:response.status});
    return result;
  }
  async function load(offset=0) {
    const mine=++version.current;
    controller.current?.abort(); controller.current=new AbortController();
    setState('loading'); setNotice('');
    try {
      const result=await request('GET',null,offset);
      if(version.current!==mine) return;
      if(!Array.isArray(result.discounts)||result.page!==offset||typeof result.hasMore!=='boolean') throw new Error();
      setRows(old=>offset===0?result.discounts:[...old.filter(row=>!result.discounts.some(next=>next.id===row.id)),...result.discounts]);
      setPage(offset);setHasMore(result.hasMore);setState('ready');
    } catch(error) { if(version.current===mine) {setState('error');setNotice(error.status===401||error.status===403?'auth':'unavailable');} }
  }
  useEffect(()=>{void load(); return ()=>{version.current++;controller.current?.abort();};},[supabase,expectedEmail]);
  function open(row,duplicate=false) {setNotice('');setForm(row?{...row,id:duplicate?null:row.id,revision:duplicate?null:row.revision,code:duplicate?'':row.code,used:false,startsAt:localDate(row.startsAt),endsAt:localDate(row.endsAt)}:blank());}
  async function save(event) {
    event.preventDefault();if(saveLock.current) return;
    saveLock.current=true;setSaving(true);setNotice('');const mine=version.current;
    try {
      const fields=new FormData(event.currentTarget), startsAt=String(fields.get('startsAt')||''), endsAt=String(fields.get('endsAt')||'');
      const body={...form,percentage:Number(form.percentage),minimumSubtotal:Number(form.minimumSubtotal),startsAt:startsAt?new Date(startsAt).toISOString():null,endsAt:endsAt?new Date(endsAt).toISOString():null};
      const result=await request('POST',body);
      if(version.current!==mine)return;
      if(!result.discount?.id)throw new Error();
      setRows(old=>[result.discount,...old.filter(row=>row.id!==result.discount.id)]);setForm(null);setNotice('saved');setState('ready');
    } catch(error) {if(version.current===mine)setNotice(error.status===409?'changed':error.status===400?'invalid':error.status===401||error.status===403?'auth':'unavailable');}
    finally {saveLock.current=false;setSaving(false);}
  }
  const shown=rows.filter(row=>(filter==='all'||discountStatus(row)===filter)&&`${row.code} ${row.title} ${row.email}`.toLowerCase().includes(search.toLowerCase()));
  const set=(key,value)=>setForm(old=>({...old,[key]:value}));
  const date=value=>value?new Intl.DateTimeFormat(language==='ru'?'ru-RU':'en-US',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):null;
  return <section className="ops-studio ops-discounts" aria-label={t.title}>
    <header className="ops-header"><div><span className="ops-eyebrow">10BVC · {t.source}</span><h1>{t.title}</h1><p>{t.subtitle}</p></div><button className="ops-discount-primary" onClick={()=>open()} disabled={saving}>{t.create}</button></header>
    <div className="ops-discount-note">{t.history}</div>
    {notice&&<p className={`ops-notice ${notice==='saved'?'ops-save-success':''}`} role={notice==='saved'?'status':'alert'}>{t[notice]}</p>}
    {form&&<form className="ops-panel ops-discount-editor" onSubmit={save} aria-label={t.formTitle}>
      <div className="ops-panel-heading"><h2>{t.formTitle}</h2><p>{t.identity}</p></div>
      <fieldset disabled={saving} className="ops-discount-fields">
        <label>{t.code}<input autoFocus required maxLength={80} pattern="[A-Za-z0-9_-]+" value={form.code} disabled={!!form.id} onChange={e=>set('code',e.target.value.toUpperCase())}/></label>
        <label>{t.titleLabel}<input maxLength={120} value={form.title} onChange={e=>set('title',e.target.value)}/></label>
        <label>{t.percentage}<input required type="number" min="0.01" max="100" step="0.01" value={form.percentage} onChange={e=>set('percentage',e.target.value)}/><small>{t.percentHint}</small></label>
        <label>{t.minimum}<input required type="number" min="0" max="100000" step="0.01" value={form.minimumSubtotal} onChange={e=>set('minimumSubtotal',e.target.value)}/></label>
        <label>{t.customer}<select value={form.audience} disabled={!!form.id} onChange={e=>set('audience',e.target.value)}><option value="public">{t.public}</option><option value="personal">{t.personal}</option></select></label>
        {form.audience==='personal'&&<label>{t.customerEmail}<input type="email" required maxLength={254} disabled={!!form.id} value={form.email} onChange={e=>set('email',e.target.value)}/></label>}
        <label>{t.starts}<input type="datetime-local" name="startsAt" value={form.startsAt} onInput={e=>set('startsAt',e.currentTarget.value)} onChange={e=>set('startsAt',e.target.value)}/>{!form.startsAt&&<small>{t.noStart}</small>}</label>
        <label>{t.ends}<input type="datetime-local" name="endsAt" value={form.endsAt} onInput={e=>set('endsAt',e.currentTarget.value)} onChange={e=>set('endsAt',e.target.value)}/>{!form.endsAt&&<small>{t.noEnd}</small>}</label>
        <label className="ops-discount-checkbox"><input type="checkbox" checked={form.active} onChange={e=>set('active',e.target.checked)}/>{t.activeLabel}</label>
      </fieldset>
      <p className="ops-caveat">{t.scheduleHint} <strong>{zone}</strong></p><p className="ops-caveat">{t.combinations}</p><p className="ops-caveat">{t.usage}</p>
      <div className="ops-discount-actions"><button type="submit" className="ops-discount-primary" disabled={saving}>{saving?t.saving:t.save}</button><button type="button" disabled={saving} onClick={()=>setForm(null)}>{t.cancel}</button></div>
    </form>}
    <section className="ops-panel">
      <div className="ops-discount-toolbar"><input type="search" aria-label={t.search} placeholder={t.search} value={search} onChange={e=>setSearch(e.target.value)}/><button disabled={state==='loading'||saving} onClick={()=>load()}>{t.retry}</button></div>
      <div className="ops-discount-filters" role="group" aria-label={t.status}>{['all','active','scheduled','expired','inactive','used'].map(key=><button key={key} aria-pressed={filter===key} onClick={()=>setFilter(key)}>{t[key]}</button>)}</div>
      <div className="ops-table-scroll"><table><thead><tr>{[t.code,t.status,t.value,t.customer,t.period,''].map((value,i)=><th key={i} scope="col">{value}</th>)}</tr></thead><tbody>{shown.map(row=><tr key={row.id}><td><strong>{row.code}</strong>{row.title&&<small>{row.title}</small>}</td><td><span className={`ops-discount-badge ${discountStatus(row)}`}>{t[discountStatus(row)]}</span></td><td>{row.percentage}% {t.off}{row.minimumSubtotal>0&&<small>≥ ${row.minimumSubtotal.toFixed(2)}</small>}</td><td>{row.audience==='public'?t.public:row.email}</td><td>{date(row.startsAt)||t.noStart}<small>{date(row.endsAt)||t.noEnd}</small></td><td><div className="ops-discount-row-actions"><button disabled={row.used||saving} onClick={()=>open(row)}>{t.edit}</button><button disabled={saving} onClick={()=>open(row,true)}>{t.duplicate}</button></div></td></tr>)}</tbody></table></div>
      {state==='loading'?<p role="status">{t.loading}</p>:state==='ready'&&shown.length===0?<p>{t.empty} {t.noMatches}</p>:null}
      <div className="ops-discount-bottom"><span>{rows.length} {t.loaded}</span>{hasMore&&<button disabled={state==='loading'||saving} onClick={()=>load(page+1)}>{t.next}</button>}</div>
    </section>
    <section className="ops-panel"><div className="ops-panel-heading"><h2>{t.builtin}</h2></div><p>{t.builtinText}</p><p className="ops-caveat">{t.historySource}</p></section>
  </section>;
}
