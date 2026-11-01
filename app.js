const form = document.getElementById('chatForm');
const promptBox = document.getElementById('prompt');
const messagesEl = document.getElementById('messages');
const welcome = document.getElementById('welcome');
const sendBtn = document.getElementById('sendBtn');
const historyEl = document.getElementById('history');
const toastEl = document.getElementById('toast');
let messages = [];
let chats = [];
let busy = false;
let toastTimer;

function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove('show'),2600)}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderMessage(role,text){
  welcome.style.display='none';
  const wrap=document.createElement('div');wrap.className=`message ${role}`;
  const avatar=document.createElement('div');avatar.className='msg-avatar';avatar.textContent=role==='user'?'A':'✦';
  const content=document.createElement('div');content.className='msg-content';content.innerHTML=escapeHtml(text);
  wrap.append(avatar,content);messagesEl.appendChild(wrap);scrollBottom();return content;
}
function scrollBottom(){const area=document.getElementById('chatArea');area.scrollTop=area.scrollHeight}
function showTyping(){
 const wrap=document.createElement('div');wrap.className='message assistant';wrap.id='typing';
 wrap.innerHTML='<div class="msg-avatar">✦</div><div class="typing"><span></span><span></span><span></span></div>';
 messagesEl.appendChild(wrap);scrollBottom();
}
function saveCurrentChat(){
 if(!messages.length)return;
 const first=messages.find(m=>m.role==='user')?.content||'New chat';
 const title=first.length>38?first.slice(0,38)+'…':first;
 const last=chats[0];
 if(last && last.id===window.currentChatId){last.messages=[...messages];last.title=title;}
 else {window.currentChatId=Date.now();chats.unshift({id:window.currentChatId,title,messages:[...messages]});}
 try{localStorage.setItem('aliAIChats',JSON.stringify(chats.slice(0,25)))}catch(e){}
 renderHistory();
}
function renderHistory(){
 historyEl.innerHTML='';
 if(!chats.length){historyEl.innerHTML='<div class="history-empty">Your recent chats will appear here.</div>';return}
 chats.slice(0,15).forEach(chat=>{
  const b=document.createElement('button');b.className='history-item';b.textContent='◦  '+chat.title;b.title=chat.title;
  b.onclick=()=>{messages=[...chat.messages];window.currentChatId=chat.id;messagesEl.innerHTML='';messages.forEach(m=>renderMessage(m.role,m.content));welcome.style.display=messages.length?'none':'';document.getElementById('sidebar').classList.remove('open')};
  historyEl.appendChild(b);
 });
}
try{chats=JSON.parse(localStorage.getItem('aliAIChats')||'[]')}catch(e){chats=[]}renderHistory();

async function sendMessage(text){
 text=text.trim();if(!text||busy)return;
 busy=true;sendBtn.disabled=true;promptBox.value='';resizeInput();
 messages.push({role:'user',content:text});renderMessage('user',text);showTyping();
 try{
   const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages})});
   const data=await response.json();
   document.getElementById('typing')?.remove();
   if(!response.ok)throw new Error(data.error||'Request failed');
   const reply=data.reply||'I could not generate a reply. Please try again.';
   messages.push({role:'assistant',content:reply});renderMessage('assistant',reply);saveCurrentChat();
 }catch(err){
   document.getElementById('typing')?.remove();
   const message=err.message.includes('Failed to fetch')?'Could not connect. Make sure the local server is running.':err.message;
   renderMessage('assistant','Sorry bro — '+message);
   toast('AI connection error');
 }finally{busy=false;sendBtn.disabled=false;promptBox.focus()}
}
form.addEventListener('submit',e=>{e.preventDefault();sendMessage(promptBox.value)});
promptBox.addEventListener('input',resizeInput);
promptBox.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit()}});
function resizeInput(){promptBox.style.height='auto';promptBox.style.height=Math.min(promptBox.scrollHeight,180)+'px'}
document.querySelectorAll('.suggestion').forEach(b=>b.addEventListener('click',()=>sendMessage(b.dataset.prompt)));
document.getElementById('newChat').addEventListener('click',()=>{messages=[];window.currentChatId=null;messagesEl.innerHTML='';welcome.style.display='';promptBox.value='';document.getElementById('sidebar').classList.remove('open');promptBox.focus()});
document.getElementById('clearBtn').addEventListener('click',()=>{if(!messages.length){toast('This chat is already empty');return}messages=[];window.currentChatId=null;messagesEl.innerHTML='';welcome.style.display='';toast('Current chat cleared')});
document.getElementById('menuBtn').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
document.addEventListener('click',e=>{const side=document.getElementById('sidebar');if(innerWidth<=700&&side.classList.contains('open')&&!side.contains(e.target)&&!e.target.closest('#menuBtn'))side.classList.remove('open')});
