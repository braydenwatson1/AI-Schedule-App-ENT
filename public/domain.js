export const categories=['work','home','family','personal'];
export function zonedParts(date,timezone){return Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));}
export function dayKey(date=new Date(),timezone=Intl.DateTimeFormat().resolvedOptions().timeZone){const p=zonedParts(date,timezone);return `${p.year}-${p.month}-${p.day}`;}
export function localToISO(value,timezone){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw Error('Use a date and time, such as 2026-11-10T11:00.');
 const [day,time]=value.split('T'),[y,m,d]=day.split('-').map(Number),[h,min]=time.split(':').map(Number);const target=Date.UTC(y,m-1,d,h,min);let guess=target;
 for(let i=0;i<4;i++){const p=zonedParts(new Date(guess),timezone);const shown=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);guess+=target-shown;}
 const p=zonedParts(new Date(guess),timezone);if(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`!==value)throw Error('That local time does not exist. Please choose another time.');
 // DST fall-back can map one wall-clock time to two instants. Ask rather than guess.
 for(const delta of [-3600000,3600000,-1800000,1800000]){const q=zonedParts(new Date(guess+delta),timezone);if(`${q.year}-${q.month}-${q.day}T${q.hour}:${q.minute}`===value)throw Error('That time occurs twice as clocks change. Choose an unambiguous time.');}
 return new Date(guess).toISOString();
}
export function validateSettings(s){
 if(!s||!Array.isArray(s.times)||s.times.length>6||s.times.some(t=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(t))||new Set(s.times).size!==s.times.length)throw Error('Choose up to six different valid brief times.');
 if(!['chronological','sections','essentials'].includes(s.format))throw Error('Choose a brief format.');
 try{new Intl.DateTimeFormat('en',{timeZone:s.timezone}).format();}catch{throw Error('Choose a valid time zone.');}
 return {times:s.times,format:s.format,timezone:s.timezone,smsOptIn:s.smsOptIn===true};
}
export function validateAction(a){
 const allowed=['create_event','create_task','complete_task','cancel_event','send_email','read_email','trash_email'];
 if(!a||!allowed.includes(a.type))throw Error('Unsupported action.');
 const clean={type:a.type,title:String(a.title||'').slice(0,160),start:String(a.start||''),end:String(a.end||''),due:String(a.due||''),category:categories.includes(a.category)?a.category:'personal',targetId:String(a.targetId||''),accountId:String(a.accountId||''),to:String(a.to||''),subject:String(a.subject||'').slice(0,200),body:String(a.body||'').slice(0,5000)};
 if(['create_event','create_task'].includes(a.type)&&!clean.title.trim())throw Error('A title is required.');
 if(a.type==='create_event'&&(!Number.isFinite(Date.parse(clean.start))||!Number.isFinite(Date.parse(clean.end))||Date.parse(clean.end)<=Date.parse(clean.start)||Date.parse(clean.end)-Date.parse(clean.start)>86400000))throw Error('Choose a valid event time and duration under 24 hours.');
 if(a.type==='create_task'&&!/^\d{4}-\d{2}-\d{2}$/.test(clean.due))throw Error('A task needs a due date.');
 if(['complete_task','cancel_event','read_email','trash_email'].includes(a.type)&&!clean.targetId)throw Error('Select an exact item first.');
 if(a.type==='send_email'&&(!/^[^\s@<>,;:"()\[\]\\\r\n]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(clean.to)||/[\r\n]/.test(clean.subject)||!clean.body.trim()))throw Error('An exact single recipient, single-line subject, and message are required.');
 return clean;
}
export function actionTitle(a){return ({create_event:'Add an appointment',create_task:'Remember a task',complete_task:'Complete this task',cancel_event:'Cancel this appointment',send_email:'Send this exact email',read_email:'Mark this email as read',trash_email:'Move this email to Trash'})[a.type]||'Review action';}
export function actionDetail(a,timezone){const f=v=>new Date(v).toLocaleString([],{timeZone:timezone,dateStyle:'medium',timeStyle:'short'});switch(a.type){case'create_event':return `${a.title}\n${f(a.start)} – ${f(a.end)}\nTime zone: ${timezone}\nCalendar: ${a.accountLabel||'selected Google account, primary calendar'}`;case'create_task':return `${a.title}\nDue: ${a.due}${a.time?' at '+formatReminderTime(a.time):''}\nSection: ${a.category}`;case'send_email':return `From: ${a.accountLabel||"fictional demo account"}\nTo: ${a.to}\nSubject: ${a.subject}\n\n${a.body}`;default:return `${a.title||a.subject}\n${a.detail||''}`;}}
export function next24(events,now=Date.now()){return events.filter(e=>new Date(e.end||e.start).getTime()>now&&new Date(e.start).getTime()<now+86400000).sort((a,b)=>new Date(a.start)-new Date(b.start));}
export function briefText(profile,settings,events,tasks,now=new Date()){
 const date=dayKey(now,settings.timezone),f=e=>(dayKey(new Date(e.start),settings.timezone)===date?'Today ':'Tomorrow ')+new Date(e.start).toLocaleTimeString([],{timeZone:settings.timezone,hour:'numeric',minute:'2-digit'}),upcoming=next24(events,now.getTime()),open=tasks.filter(t=>!t.done&&t.due<=date);
 let lines=[`Hi ${profile.name||'there'} ☀`,`Here’s a little clarity for your day.`, ''];
 if(settings.format==='sections'){for(const [key,title]of Object.entries({work:'WORK',home:'HOME',family:'FAMILY',personal:'YOU'})){const es=upcoming.filter(e=>e.category===key),ts=open.filter(t=>t.category===key);if(es.length||ts.length)lines.push(title,...es.map(e=>`${f(e)} · ${e.title}`),...ts.map(t=>`☐ ${t.title}`),'');}}
 else if(settings.format==='essentials'){lines.push(upcoming.length?`Next: ${f(upcoming[0])} · ${upcoming[0].title}`:'No appointments in the next 24 hours.',`${open.length} open tasks due today or earlier.`,...open.slice(0,3).map(t=>`☐ ${t.title}`));}
 else{lines.push(...upcoming.map(e=>`${f(e)} · ${e.title}`));if(open.length)lines.push('','WHEN YOU HAVE A MOMENT',...open.map(t=>`☐ ${t.title}`));}
 if(!upcoming.length&&!open.length)lines.push('A little breathing room. Nothing due right now.');lines.push('','Text back if something changes.');return lines.join('\n');
}
export function demoSeed(){const now=Date.now(),at=n=>new Date(now+n*3600000).toISOString(),date=dayKey();return {profile:{name:'Alex',phone:'',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone},settings:{times:['07:00','17:00'],format:'chronological',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,smsOptIn:false},connections:{gmail:true,calendar:true,microsoft:false,apple:false,sms:true},events:[{id:'demo-school',title:'School pickup',start:at(2),end:at(2.5),category:'family',source:'Google Calendar · fictional'},{id:'demo-review',title:'Project check-in',start:at(4),end:at(4.5),category:'work',source:'Google Calendar · fictional'},{id:'demo-dentist',title:'Dentist appointment',start:at(20),end:at(20.5),category:'personal',source:'Google Calendar · fictional'}],tasks:[{id:'demo-waiver',title:'Sign the school field-trip waiver',due:date,category:'family',done:false,source:'Fictional school email'},{id:'demo-groceries',title:'Pick up something simple for dinner',due:date,category:'home',done:false,source:'Your assistant'}],emails:[{id:'mail-school',from:'Oakwood School <office@school.example>',subject:'A little reminder: field-trip waiver',snippet:'Please sign the permission form before Friday. Let us know if you have questions.',category:'attention',read:false,received:'2 weeks ago · fictional',accountId:'demo'},{id:'mail-dentist',from:'Willow Dental <appointments@dentist.example>',subject:'Your upcoming appointment',snippet:'We look forward to seeing you. Reply if you need to make a change.',category:'attention',read:false,received:'Yesterday · fictional',accountId:'demo'},{id:'mail-work',from:'Team <team@work.example>',subject:'Project check-in agenda',snippet:'Here is the agenda for our next check-in. Please review the draft.',category:'attention',read:false,received:'Today · fictional',accountId:'demo'},{id:'mail-promo',from:'Everyday Store <offers@store.example>',subject:'A little something for your week',snippet:'Our weekly offers are here. Browse when you have a moment.',category:'promotions',read:false,received:'Today · fictional',accountId:'demo'}],messages:[],pending:[]};}
// Demo-only reminder parser for the Wizard of Oz test. It reads plain phrases such as
// "remind me to call mom Friday at 5pm" and returns a task proposal. Nothing leaves the browser.
const WEEKDAYS=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
export function reminderFromText(text,timezone,now=new Date(),skipTrigger=false){
 const lower=text.toLowerCase().replace(/[’']/g,'\'');
 const trigger=/\b(remind me|set (?:a |an )?reminder|reminder|remember to|don't let me forget|add (?:a )?(?:task|to-?do))\b/.test(lower)||(/\b(today|tonight|tomorrow|tomrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week)\b/.test(lower)&&/^(?:i need to |i have to |i should |need to )?(buy|shop|pick up|call|text|email|pay|book|schedule|clean|finish|send|return|order|renew|water|feed|grab)\b/.test(lower));
 if(!trigger&&!skipTrigger)return null;
 const p=zonedParts(now,timezone),base=new Date(`${p.year}-${p.month}-${p.day}T12:00:00Z`);let days=0,dateWords=[];
 const take=re=>{const m=lower.match(re);if(m)dateWords.push(m[0]);return m;};
 let m;
 if(take(/\b(tomorrow|tomrow)( (morning|afternoon|evening|night))?\b/))days=1;
 else if(take(/\b(today|tonight)\b/))days=0;
 else if(take(/\bnext week\b/))days=7;
 else if((m=take(/\bin (\d{1,2}|a|one|two|three|four|five|six|seven) (day|days|week|weeks)\b/))){const n={a:1,one:1,two:2,three:3,four:4,five:5,six:6,seven:7}[m[1]]||Number(m[1]);days=/week/.test(m[2])?n*7:n;}
 else if((m=take(/\b(?:on |this |next )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/))){days=(WEEKDAYS.indexOf(m[1])-base.getUTCDay()+7)%7;if(!days&&/^next /.test(m[0]))days=7;}
 else if((m=take(/\b(?:on )?(\d{1,2})\/(\d{1,2})\b/))){const target=new Date(Date.UTC(base.getUTCFullYear(),Number(m[1])-1,Number(m[2]),12));if(target<base)target.setUTCFullYear(target.getUTCFullYear()+1);days=Math.round((target-base)/86400000);}
 const due=new Date(base.getTime()+days*86400000).toISOString().slice(0,10);
 let time='';
 if((m=take(/\b(?:at |by |around )?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/))||(m=take(/\b(?:at|by|around) (\d{1,2})(?::(\d{2}))?\b/))){let h=Number(m[1]);const min=m[2]||'00',suffix=m[3]||'';if(/p/.test(suffix)&&h<12)h+=12;if(/a/.test(suffix)&&h===12)h=0;if(!suffix&&h>=1&&h<=7)h+=12;if(h<24&&Number(min)<60)time=`${String(h).padStart(2,'0')}:${min}`;}
 else if(take(/\b(?:at )?noon\b/))time='12:00';
 else if(/\btonight\b|\b(this |tomorrow )?evening\b/.test(lower)){take(/\b(this |tomorrow )?evening\b/);time='19:00';}
 else if(take(/\b(?:in the |this )?morning\b/))time='09:00';
 else if(take(/\b(?:in the |this )?afternoon\b/))time='15:00';
 let title=text;
 for(const w of dateWords)title=title.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'),' ');
 title=title.replace(/[’']/g,'\'').replace(/^\s*(?:hey|hi|ok|okay)?[,\s]*(?:can you |could you |please |pls )*/i,'').replace(/\b(?:please |can you |could you )?(?:remind me|set (?:a |an )?reminder|reminder|remember|don't let me forget|add (?:a )?(?:task|to-?do))\b\s*(?:to|that|about|for|:)?\s*/i,'').replace(/\b(?:i need to|i have to|i should|need to)\s+/i,'').replace(/\b(?:on|at|by|for|this|next)\s*$/i,'').replace(/[?.!,]+$/,'').replace(/\s{2,}/g,' ').trim();
 if(!title)return {missing:true,due,time};
 title=title.charAt(0).toUpperCase()+title.slice(1);
 const t=title.toLowerCase(),category=/\b(meeting|boss|report|client|project|work|deadline|presentation|slides|invoice)\b/.test(t)?'work':/\b(mom|dad|kid|kids|son|daughter|school|family|birthday|grandma|grandpa|wife|husband|sister|brother|baby|practice|waiver)\b/.test(t)?'family':/\b(grocer|detergent|laundry|clean|trash|dishes|bills?|rent|dog|cat|plants?|milk|eggs|dinner|house|home)\b/.test(t)?'home':'personal';
 return {title,due,time,category,days};
}
// Demo-only appointment parser: "put my dentist appointment tomorrow at 4pm in the schedule",
// "I have a haircut Friday at 2". Returns an event proposal, or {needsTime} when no time was given.
const EVENT_WORDS=/\b(appointment|appt|meeting|dentist|dentest|dentists|doctor|doctors|dr|checkup|check-up|physical|haircut|interview|lunch|dinner|breakfast|brunch|coffee|game|practice|class|lesson|party|recital|conference|flight|vet|therapy|session|date night|concert|recital|rehearsal|shift|tutoring)\b/;
export function appointmentFromText(text,timezone,now=new Date()){
 const lower=text.toLowerCase().replace(/[’']/g,'\'');
 if(/\b(remind me|reminder|remember|don't let me forget|cancel|draft|email)\b/.test(lower)||/^\s*(what|when|where|why|how|is|are|do|does)\b/.test(lower))return null;
 const calendarAsk=/\b(put|add|schedule|book|set up|make|create|pencil)\b/.test(lower)&&/\b(calendar|schedule|appointment|appt|meeting)\b/.test(lower);
 const hasWhen=/\b(today|tonight|tomorrow|tomrow|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|in \w+ (day|days|week|weeks))\b|\d{1,2}\/\d{1,2}|\d\s*(am|pm|a\.m\.|p\.m\.)|\b(at|around) \d{1,2}|\bnoon\b/.test(lower);
 if(!hasWhen||!(calendarAsk||EVENT_WORDS.test(lower)))return null;
 const r=reminderFromText(text,timezone,now,true);
 let title=(r.title||'').replace(/\bdentest\b/ig,'dentist').replace(/\bdoctors\b/ig,'doctor\'s').replace(/\bdentists\b/ig,'dentist').replace(/^(?:please |can you |could you )*(?:put|add|schedule|book|set up|make|create|pencil in|pencil)\s+/i,'').replace(/^(?:i have|i've got|i got|there's|there is|we have)\s+/i,'').replace(/\b(?:in|on|to|into)\s+(?:the|my)\s+(?:schedule|calendar)\b/ig,'').replace(/^(?:my|a|an|the|our)\s+/i,'').replace(/\s+(?:on|at|for|in)\s*$/i,'').replace(/\s{2,}/g,' ').trim();
 if(!title)title='Appointment';
 if(/^(dentist|doctor|vet|eye doctor|dr\.? \w+)$/i.test(title))title+=' appointment';
 title=title.charAt(0).toUpperCase()+title.slice(1);
 if(!r.time)return {needsTime:true,title,due:r.due,days:r.days};
 const start=localToISO(`${r.due}T${r.time}`,timezone),minutes=/\b(lunch|dinner|meeting|class|game|practice|party|interview|concert)\b/i.test(title)?60:30;
 return {title,due:r.due,time:r.time,days:r.days,start,end:new Date(Date.parse(start)+minutes*60000).toISOString(),category:/\b(meeting|interview|conference|client|shift|work)\b/i.test(title)?'work':/\b(practice|game|recital|school|kid|family|party)\b/i.test(title)?'family':'personal'};
}
export function formatReminderTime(time){if(!time)return '';const [h,m]=time.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;}
function reminderWhen(r){const day=r.days===0?'today':r.days===1?'tomorrow':new Date(r.due+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC',weekday:'long',month:'short',day:'numeric'});return day+(r.time?' at '+formatReminderTime(r.time):'');}
export function demoPlan(text,data){const lower=text.toLowerCase(),timezone=data.settings.timezone;
 let appointment=null;try{appointment=appointmentFromText(text,timezone);}catch(e){return {reply:e.message};}
 if(appointment?.needsTime)return {reply:`What time is your ${appointment.title.toLowerCase()}? Try something like “${appointment.title.toLowerCase()} ${reminderWhen({...appointment,time:''})} at 4pm.”`};
 if(appointment)return {reply:`Sounds good. I’ll add “${appointment.title}” to your calendar ${reminderWhen(appointment)}. Check the details and approve it.`,action:{type:'create_event',title:appointment.title,start:appointment.start,end:appointment.end,category:appointment.category}};
 const reminder=reminderFromText(text,timezone);
 if(reminder?.missing)return {reply:'Happy to. What would you like me to remind you about?'};
 if(reminder){const what=(reminder.title.charAt(0).toLowerCase()+reminder.title.slice(1)).replace(/\bmy\b/g,'your').replace(/\bme\b/g,'you').replace(/\bmyself\b/g,'yourself');return {reply:`Got it. I’ll remind you ${/^(the|a|an|your|our|his|her|their)\b/.test(what)?'about':'to'} ${what} ${reminderWhen(reminder)}. Take a quick look and approve it.`,action:{type:'create_task',title:reminder.title,due:reminder.due,time:reminder.time,category:reminder.category}};}
 if(/cancel/.test(lower)&&/dentist/.test(lower)){const matches=data.events.filter(e=>/dentist/i.test(e.title));if(matches.length!==1)return {reply:matches.length?'There’s more than one dentist appointment. Open Next 24 hours or tell me the exact date so we can choose the right one.':'I don’t see a dentist appointment in the demo schedule.'};return {reply:'I found this appointment. Review it before I remove it from the fictional calendar. This does not contact the dentist.',action:{type:'cancel_event',title:matches[0].title,targetId:matches[0].id,detail:new Date(matches[0].start).toLocaleString()}};}
 if(/email|dentist/.test(lower)&&/draft|send|write/.test(lower))return {reply:'Here’s a fictional cancellation email. Check the recipient and wording before approving.',action:{type:'send_email',to:'appointments@dentist.example',subject:'Appointment cancellation request',body:'Hello,\nI need to cancel my upcoming appointment. Please confirm the cancellation.\nThank you,\n'+data.profile.name,accountId:'demo'}};
 if(/next tuesday/.test(lower)&&/dentist/.test(lower)){const p=zonedParts(new Date(),timezone),d=new Date(`${p.year}-${p.month}-${p.day}T12:00:00Z`);let delta=(2-d.getUTCDay()+7)%7;if(!delta)delta=7;d.setUTCDate(d.getUTCDate()+delta);const date=d.toISOString().slice(0,10);let h=Number(lower.match(/at\s+(\d{1,2})/)?.[1]||11);if(/\bpm\b/.test(lower)&&h<12)h+=12;const start=localToISO(`${date}T${String(h).padStart(2,'0')}:00`,timezone);return {reply:'I’ve interpreted that as the upcoming Tuesday at '+h+':00 in your time zone, for 30 minutes. Check the date and time before adding it.',action:{type:'create_event',title:'Dentist appointment',start,end:new Date(Date.parse(start)+1800000).toISOString(),category:'personal'}};}
 if(/brief|today|tomorrow|schedule|my day|day look/.test(lower))return {reply:briefText(data.profile,data.settings,data.events,data.tasks)};
 if(/waiver|school|email|inbox/.test(lower))return {reply:'In this fictional inbox, there’s a school waiver to check. Open Email to mark it done or ask for a follow-up. A real connection will need your Google permission.'};
 return {reply:'This concept demo uses scripted examples, not a live AI model. Try “remind me to call mom Friday at 5pm,” “next Tuesday at 11 I have a dentist,” “cancel my dentist appointment,” or “draft an email to my dentist.” The real server uses an AI API once configured.'};
}
