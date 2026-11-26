export function renderAppPage(csrfToken: string): string {
  return String.raw\`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b0d10">
<meta name="csrf-token" content="\${csrfToken.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">
<meta name="description" content="LifeSort private task and agent control centre">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/app-icon.svg" type="image/svg+xml">
<title>LifeSort · Command Centre</title>
<style>
:root{color-scheme:dark;--bg:#0b0d10;--panel:#12161b;--panel2:#171c22;--line:#252c34;--muted:#8d98a6;--text:#eff3f6;--accent:#d9ff5a;--accent2:#a8ca38;--blue:#8dbbff;--red:#ff7a82;--orange:#ffba74;--green:#9de6b2;--radius:18px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(900px 500px at 85% -10%,#202a29 0%,transparent 56%),var(--bg);color:var(--text);min-height:100vh}button,input,textarea,select{font:inherit}button{cursor:pointer}a{color:inherit;text-decoration:none}.shell{display:grid;grid-template-columns:236px minmax(0,1fr);min-height:100vh}.sidebar{border-right:1px solid var(--line);padding:26px 16px;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;background:#0b0d10d9;backdrop-filter:blur(18px)}.brand{display:flex;gap:11px;align-items:center;padding:0 10px 30px}.logo{width:33px;height:33px;border-radius:11px;background:var(--accent);color:#0a0c0e;display:grid;place-items:center;font-weight:950;font-size:19px;letter-spacing:-2px}.brand strong{font-size:15px;letter-spacing:.12em}.brand small{display:block;color:var(--muted);font-size:10px;letter-spacing:.15em;text-transform:uppercase;margin-top:3px}.nav{display:grid;gap:7px}.nav button{display:flex;gap:12px;align-items:center;text-align:left;border:0;background:transparent;color:var(--muted);padding:12px 13px;border-radius:12px;font-size:13px}.nav button.active,.nav button:hover{background:#1a2125;color:var(--text)}.nav .navicon{width:18px;text-align:center;font-size:16px}.sidefoot{margin-top:auto;padding:12px 10px;color:var(--muted);font-size:11px;line-height:1.55}.sidefoot b{color:var(--green);font-weight:600}.main{min-width:0;padding:30px clamp(18px,4vw,56px) 60px;max-width:1600px;width:100%;margin:0 auto}.topbar{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:34px}.eyebrow{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);font-weight:700}.topbar h1{font-size:clamp(27px,4vw,39px);letter-spacing:-.055em;margin:8px 0 0;font-weight:750}.top-right{display:flex;align-items:center;gap:10px}.connection{display:flex;align-items:center;gap:8px;border:1px solid var(--line);padding:8px 12px;border-radius:999px;font-size:11px;color:var(--muted)}.dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 12px #9de6b275}.avatar{width:32px;height:32px;border-radius:50%;background:#20272d;display:grid;place-items:center;color:var(--accent);font-size:12px;font-weight:700}.view{display:none}.view.active{display:block}.grid{display:grid;gap:14px}.metrics{grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:20px}.card{background:linear-gradient(145deg,#171c22,#11151a);border:1px solid var(--line);border-radius:var(--radius);padding:19px;min-width:0}.metric-label{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.12em}.metric-value{font-size:34px;letter-spacing:-.06em;font-weight:750;margin-top:12px}.metric-note{font-size:11px;color:var(--muted);margin-top:4px}.two-col{grid-template-columns:minmax(0,1.4fr) minmax(280px,.8fr)}.section-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:15px}.section-head h2,.section-head h3{margin:0;font-size:15px;letter-spacing:-.02em}.muted{color:var(--muted)}.small{font-size:12px}.btn{border:1px solid var(--line);border-radius:11px;background:#1a2026;color:var(--text);padding:10px 14px;font-size:12px;font-weight:650;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:.15s}.btn:hover{border-color:#52606c;background:#222a31}.btn.primary{background:var(--accent);color:#10130c;border-color:var(--accent)}.btn.primary:hover{background:#e6ff84}.btn.danger{color:var(--red);border-color:#66343a}.btn.ghost{background:transparent}.btn:disabled{opacity:.45;cursor:not-allowed}.list{display:grid;gap:8px}.conversation{display:flex;gap:14px;align-items:flex-start;padding:14px;border:1px solid var(--line);border-radius:13px;background:#11161b;cursor:pointer;transition:.15s}.conversation:hover,.conversation.selected{border-color:#65734b;background:#192019}.conversation-main{min-width:0;flex:1}.conversation-title{font-size:13px;font-weight:650;line-height:1.4;overflow-wrap:anywhere}.conversation-meta{font-size:11px;color:var(--muted);margin-top:6px;display:flex;gap:9px;flex-wrap:wrap}.status{white-space:nowrap;padding:5px 8px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:.04em;border:1px solid var(--line);color:var(--muted)}.status.running{color:var(--green);border-color:#31523b;background:#17251c}.status.paused{color:var(--orange);border-color:#59432f;background:#241d16}.status.failed{color:var(--red);border-color:#5b3038;background:#25171a}.empty{padding:32px 18px;text-align:center;border:1px dashed #313a43;border-radius:14px;color:var(--muted);font-size:12px}.empty strong{display:block;color:var(--text);font-size:14px;margin-bottom:6px}.filter-row{display:flex;gap:9px;align-items:center;margin-bottom:14px;flex-wrap:wrap}.field{display:grid;gap:7px}.field label{font-size:11px;color:#b5bec8;font-weight:650}.field input,.field textarea,.field select,.filter-row input{width:100%;border:1px solid #303842;border-radius:11px;background:#0e1216;color:var(--text);padding:11px 12px;outline:none}.field input:focus,.field textarea:focus,.field select:focus,.filter-row input:focus{border-color:#849a4b;box-shadow:0 0 0 3px #d9ff5a14}.field textarea{resize:vertical;min-height:130px;line-height:1.5}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.span2{grid-column:1/-1}.notice{padding:13px 14px;border:1px solid #51472f;background:#211d14;border-radius:12px;color:#dbc49d;font-size:11px;line-height:1.5}.detail-top{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.detail-top h2{margin:0;font-size:20px;letter-spacing:-.04em;line-height:1.25}.events{display:grid;gap:0;margin-top:15px}.event{padding:12px 0 12px 18px;border-left:1px solid #39444e;position:relative}.event:before{content:"";position:absolute;left:-4px;top:17px;width:7px;height:7px;border-radius:50%;background:var(--accent)}.event strong{font-size:11px}.event pre{white-space:pre-wrap;overflow-wrap:anywhere;color:var(--muted);font:11px/1.55 ui-monospace,monospace;margin:7px 0 0}.composer{display:grid;gap:9px;margin-top:14px}.composer textarea{min-height:94px}.actions{display:flex;gap:8px;flex-wrap:wrap}.divider{height:1px;background:var(--line);margin:18px 0}.toast{position:fixed;right:18px;bottom:20px;z-index:50;padding:12px 16px;border:1px solid var(--line);border-radius:12px;background:#1c2428;box-shadow:0 15px 40px #0008;font-size:12px;max-width:min(420px,calc(100vw - 36px));display:none}.toast.show{display:block}.toast.error{border-color:#73414a;color:#ffafb5}.task-result{white-space:pre-wrap;overflow-wrap:anywhere;padding:13px;border-radius:11px;background:#090c0f;border:1px solid var(--line);font:11px/1.6 ui-monospace,monospace;color:#bac5ce;max-height:280px;overflow:auto}.mobile-nav{display:none}.install-hint{font-size:10px;color:var(--muted)}.spinner{width:13px;height:13px;border:2px solid #ffffff40;border-top-color:currentColor;border-radius:50%;animation:spin .8s linear infinite;display:inline-block}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:850px){.shell{display:block}.sidebar{display:none}.main{padding:22px 16px calc(100px + env(safe-area-inset-bottom))}.topbar{align-items:flex-start;margin-bottom:24px}.top-right{gap:7px}.connection{font-size:10px;padding:7px 9px}.two-col{grid-template-columns:1fr}.metrics{gap:8px}.card{padding:15px}.metric-value{font-size:28px}.mobile-nav{position:fixed;display:grid;grid-template-columns:repeat(3,1fr);bottom:0;left:0;right:0;z-index:30;border-top:1px solid var(--line);background:#0d1115ed;backdrop-filter:blur(18px);padding:8px 10px calc(8px + env(safe-area-inset-bottom))}.mobile-nav button{background:transparent;border:0;color:var(--muted);font-size:10px;padding:6px;display:grid;gap:4px;justify-items:center}.mobile-nav button.active{color:var(--accent)}.mobile-nav span{font-size:17px}.form-grid{grid-template-columns:1fr}.span2{grid-column:auto}.detail-top{display:block}.detail-top .actions{margin-top:12px}}@media(max-width:420px){.metrics{grid-template-columns:1fr 1fr}.metrics .metric-card:last-child{grid-column:1/-1}.topbar h1{font-size:28px}.top-right .connection{max-width:118px;overflow:hidden}.metric-value{font-size:26px}}
</style>
</head>
<body>
<div class="shell">
<aside class="sidebar">
  <div class="brand"><div class="logo">L</div><div><strong>LIFESORT</strong><small>Command centre</small></div></div>
  <nav class="nav" aria-label="Primary">
    <button class="active" data-view="home"><span class="navicon">⌂</span>Overview</button>
    <button data-view="conversations"><span class="navicon">◫</span>Conversations</button>
    <button data-view="start"><span class="navicon">＋</span>Start a task</button>
  </nav>
  <div class="sidefoot"><b>● Private bridge</b><br>OpenHands credentials stay on the server. Only task instructions and messages you submit are sent to your LifeSort workspace.<br><br><span class="install-hint">Installable web app · Mobile ready</span></div>
</aside>
<main class="main">
  <header class="topbar">
    <div><div class="eyebrow">Personal execution system</div><h1 id="page-title">Your workspace.</h1></div>
    <div class="top-right"><div class="connection"><span class="dot"></span><span id="connection-label">Checking bridge…</span></div><div class="avatar" id="avatar">L</div></div>
  </header>
  <section class="view active" id="view-home">
    <div class="grid metrics">
      <div class="card metric-card"><div class="metric-label">Conversations</div><div class="metric-value" id="metric-total">—</div><div class="metric-note">LifeSort workspace</div></div>
      <div class="card metric-card"><div class="metric-label">Running</div><div class="metric-value" id="metric-running">—</div><div class="metric-note">Active sandboxes</div></div>
      <div class="card metric-card"><div class="metric-label">Paused</div><div class="metric-value" id="metric-paused">—</div><div class="metric-note">Waiting for you</div></div>
    </div>
    <div class="grid two-col">
      <div class="card">
        <div class="section-head"><h2>Recent work</h2><button class="btn ghost" data-go="conversations">All conversations ↗</button></div>
        <div id="recent-list" class="list"><div class="empty"><span class="spinner"></span> Loading your workspace…</div></div>
      </div>
      <div class="card">
        <div class="section-head"><h2>Start something new</h2><span class="eyebrow">Agent workspace</span></div>
        <p class="muted small" style="line-height:1.7">Give OpenHands a task in <strong style="color:var(--text)">DigvijayPatel/LifeSort</strong>. Track progress, inspect events and follow up from one place.</p>
        <div class="notice">Starting a task creates a sandbox and can consume OpenHands resources. Nothing starts until you submit the form and confirm.</div>
        <button class="btn primary" style="margin-top:15px;width:100%" data-go="start">＋ Create a LifeSort task</button>
      </div>
    </div>
  </section>
  <section class="view" id="view-conversations">
    <div class="grid two-col">
      <div class="card">
        <div class="section-head"><h2>Conversations</h2><button class="btn" id="refresh-list">↻ Refresh</button></div>
        <div class="filter-row"><input id="conversation-search" type="search" placeholder="Search conversations…" aria-label="Search conversations"></div>
        <div id="conversation-list" class="list"><div class="empty">Loading conversations…</div></div>
      </div>
      <div class="card" id="detail-panel"><div class="empty"><strong>Select a conversation</strong>Choose one from the list to inspect its status, execution events and controls.</div></div>
    </div>
  </section>
  <section class="view" id="view-start">
    <div class="card" style="max-width:850px">
      <div class="section-head"><div><div class="eyebrow">OpenHands · LifeSort</div><h2 style="margin-top:7px;font-size:21px">Start a new task</h2></div><span class="status running">READY</span></div>
      <p class="muted small" style="line-height:1.7">Describe the outcome you want. OpenHands will create a sandbox for the <strong style="color:var(--text)">DigvijayPatel/LifeSort</strong> repository and begin working from your instructions.</p>
      <form id="start-form" class="grid" style="gap:16px">
        <div class="field"><label for="task-title">Task title <span class="muted">(optional)</span></label><input id="task-title" maxlength="120" placeholder="e.g. Audit task prioritisation logic"></div>
        <div class="field"><label for="task-instructions">Instructions <span style="color:var(--red)">*</span></label><textarea id="task-instructions" minlength="10" maxlength="12000" required placeholder="Describe the task, expected result, constraints and how to verify completion…"></textarea><span class="muted" style="font-size:10px">10–12,000 characters. Be specific about the expected outcome.</span></div>
        <div class="field"><label for="task-branch">Branch <span class="muted">(optional)</span></label><input id="task-branch" maxlength="120" placeholder="main"></div>
        <div class="notice">This action creates a new OpenHands sandbox and consumes resources from your OpenHands account. Your instructions will be sent to OpenHands. Do not include passwords, API keys or other secrets.</div>
        <label style="display:flex;gap:10px;align-items:flex-start;font-size:12px;color:#c5cdd4"><input id="task-confirm" type="checkbox" style="margin-top:2px;accent-color:var(--accent)"> I understand that this will create and run a new sandbox task.</label>
        <div class="actions"><button class="btn primary" id="start-submit" type="submit">Start task ↗</button><button class="btn ghost" type="reset">Clear form</button></div>
      </form>
      <div id="task-progress" style="display:none;margin-top:22px"><div class="section-head"><h3>Task startup</h3><span id="task-progress-status" class="status">SUBMITTED</span></div><div id="task-progress-message" class="muted small">Waiting for OpenHands…</div><pre id="task-result" class="task-result" style="margin-top:12px"></pre><div class="actions" style="margin-top:12px"><button class="btn" id="task-refresh" type="button">Check status</button><button class="btn" data-go="conversations" type="button">View conversations</button></div></div>
    </div>
  </section>
  <footer class="muted small" style="margin-top:25px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><span>LifeSort · OpenHands control</span><span id="footer-account">Private owner session</span><button id="logout" class="btn ghost" style="padding:5px 9px;font-size:10px">Sign out</button></footer>
</main>
</div>
<nav class="mobile-nav" aria-label="Mobile navigation"><button class="active" data-view="home"><span>⌂</span>Overview</button><button data-view="conversations"><span>◫</span>Conversations</button><button data-view="start"><span>＋</span>New task</button></nav>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script>
(function(){
"use strict";
var activeView="home", conversations=[], selectedId=null, selectedConversation=null, startTaskId=null, toastTimer=null;
var pageTitles={home:"Your workspace.",conversations:"Conversations.",start:"Create momentum."};
var $=function(id){return document.getElementById(id);};
var esc=function(value){return String(value==null?"":value).replace(/[&<>"']/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];});};
var when=function(value){if(!value)return "Updated date unavailable";var d=new Date(value);return isNaN(d.getTime())?String(value):d.toLocaleString([], {month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});};
var norm=function(value){return String(value||"").toLowerCase();};
var statusText=function(c){return String(c.sandbox_status||c.execution_status||"unknown").replace(/[_-]/g," ").toUpperCase();};
var statusClass=function(c){var s=norm(c.sandbox_status||c.execution_status);if(s.indexOf("pause")>=0)return "paused";if(s.indexOf("fail")>=0||s.indexOf("error")>=0)return "failed";if(s.indexOf("run")>=0||s.indexOf("active")>=0)return "running";return "";};
function toast(message,error){var el=$("toast");el.textContent=message;el.className="toast show"+(error?" error":"");clearTimeout(toastTimer);toastTimer=setTimeout(function(){el.className="toast";},4200);}
async function request(path,options){
 options=options||{};var method=options.method||"GET";var headers={"Accept":"application/json"};
 if(method!=="GET"&&method!=="HEAD"){
  var csrfResponse=await fetch("/api/csrf",{credentials:"same-origin",cache:"no-store"});
  if(!csrfResponse.ok)throw new Error("Your session expired. Sign in again.");
  var csrfData=await csrfResponse.json();headers["X-LifeSort-CSRF"]=csrfData.csrf;
  if(options.body!==undefined)headers["Content-Type"]="application/json";
 }
 var response=await fetch(path,{method:method,headers:headers,body:options.body===undefined?undefined:JSON.stringify(options.body),credentials:"same-origin",cache:"no-store"});
 var data={};try{data=await response.json();}catch(e){}
 if(response.status===401){location.reload();throw new Error("Session expired. Please sign in again.");}
 if(!response.ok)throw new Error(data.error||("Request failed ("+response.status+")"));
 return data;
}
function showView(view){activeView=view;document.querySelectorAll(".view").forEach(function(el){el.classList.toggle("active",el.id==="view-"+view);});document.querySelectorAll("[data-view]").forEach(function(el){el.classList.toggle("active",el.getAttribute("data-view")===view);});$("page-title").textContent=pageTitles[view]||"LifeSort";if(view==="conversations")loadConversations();if(view==="home")loadConversations();}
document.querySelectorAll("[data-view]").forEach(function(el){el.addEventListener("click",function(){showView(el.getAttribute("data-view"));});});
document.querySelectorAll("[data-go]").forEach(function(el){el.addEventListener("click",function(){showView(el.getAttribute("data-go"));});});
function getUrl(c){return c.conversation_url||("https://app.all-hands.dev/canvas/conversations/"+encodeURIComponent(c.id));}
function renderConversation(c){
 var cls=statusClass(c);return '<div class="conversation'+(selectedId===c.id?' selected':'')+'" data-conversation="'+esc(c.id)+'"><div class="conversation-main"><div class="conversation-title">'+esc(c.title||"Untitled conversation")+'</div><div class="conversation-meta"><span>'+esc(when(c.updated_at||c.created_at))+'</span><span>'+esc(c.execution_status||c.sandbox_status||"Status unavailable")+'</span></div></div><span class="status '+cls+'">'+esc(statusText(c))+'</span></div>';
}
function filteredConversations(){var q=norm($("conversation-search").value);return conversations.filter(function(c){return !q||norm(c.title).indexOf(q)>=0||norm(c.id).indexOf(q)>=0||norm(c.sandbox_status).indexOf(q)>=0||norm(c.execution_status).indexOf(q)>=0;});}
function renderLists(){
 var filtered=filteredConversations();var html=filtered.map(renderConversation).join("")||'<div class="empty"><strong>No conversations found</strong>Start a task or change your search.</div>';
 $("conversation-list").innerHTML=html;document.querySelectorAll("[data-conversation]").forEach(function(el){el.addEventListener("click",function(){openConversation(el.getAttribute("data-conversation"));});});
 $("recent-list").innerHTML=conversations.slice(0,4).map(renderConversation).join("")||'<div class="empty"><strong>No work yet</strong>Your recent LifeSort conversations will appear here.</div>';
 document.querySelectorAll("#recent-list [data-conversation]").forEach(function(el){el.addEventListener("click",function(){showView("conversations");openConversation(el.getAttribute("data-conversation"));});});
}
async function loadAccount(){try{var d=await request("/api/account");var name=d.name||"OpenHands account";$("connection-label").textContent="Bridge connected";$("avatar").textContent=(name.trim()[0]||"L").toUpperCase();$("footer-account").textContent=name;}catch(e){$("connection-label").textContent="Bridge unavailable";$("footer-account").textContent="Connection needs attention";toast(e.message,true);}}
async function loadConversations(){
 $("conversation-list").innerHTML='<div class="empty"><span class="spinner"></span> Refreshing conversations…</div>';
 try{var d=await request("/api/conversations?limit=50");conversations=d.conversations||[];var running=conversations.filter(function(c){return statusClass(c)==="running";}).length;var paused=conversations.filter(function(c){return statusClass(c)==="paused";}).length;$("metric-total").textContent=String(d.count==null?conversations.length:d.count);$("metric-running").textContent=String(running);$("metric-paused").textContent=String(paused);renderLists();if(selectedId){var found=conversations.find(function(c){return c.id===selectedId;});if(found)selectedConversation=found;}}catch(e){$("conversation-list").innerHTML='<div class="empty"><strong>Could not load conversations</strong>'+esc(e.message)+'</div>';$("recent-list").innerHTML='<div class="empty">Conversation list is unavailable.</div>';toast(e.message,true);}
}
function extractEvents(data){if(Array.isArray(data))return data;if(data&&Array.isArray(data.events))return data.events;if(data&&Array.isArray(data.items))return data.items;if(data&&data.data&&Array.isArray(data.data))return data.data;return data?[data]:[];}
function eventLabel(e){return e.action||e.type||e.event||e.command||"Event";}
async function openConversation(id){
 selectedId=id;var c=conversations.find(function(x){return x.id===id;});selectedConversation=c||null;
 $("detail-panel").innerHTML='<div class="empty"><span class="spinner"></span> Loading conversation…</div>';renderLists();
 try{var [detail,eventData]=await Promise.all([request("/api/conversations/"+encodeURIComponent(id)),request("/api/conversations/"+encodeURIComponent(id)+"/events?limit=40")]);var item=detail.conversation||detail;selectedConversation=item;var events=extractEvents(eventData.events||eventData);var status=statusClass(item);var paused=status==="paused";var running=status==="running";var eventHtml=events.slice(-40).reverse().map(function(e){var label=eventLabel(e);var date=when(e.timestamp||e.created_at||e.time);return '<div class="event"><strong>'+esc(label)+'</strong><div class="muted" style="font-size:10px;margin-top:4px">'+esc(date)+'</div><pre>'+esc(typeof e==="string"?e:JSON.stringify(e,null,2))+'</pre></div>';}).join("")||'<div class="empty">No execution events returned yet.</div>';
 var controls=paused?'<button class="btn primary" id="resume-conversation">▶ Resume sandbox</button>':'<button class="btn" id="pause-conversation" '+(!running?'disabled':'')+'>Ⅱ Pause sandbox</button>';
 $("detail-panel").innerHTML='<div class="detail-top"><div><div class="eyebrow">Conversation detail</div><h2 style="margin-top:8px">'+esc(item.title||"Untitled conversation")+'</h2><div class="conversation-meta"><span>'+esc(item.id)+'</span><span>Updated '+esc(when(item.updated_at||item.created_at))+'</span></div></div><div class="actions"><span class="status '+status+'">'+esc(statusText(item))+'</span><a class="btn ghost" href="'+esc(getUrl(item))+'" target="_blank" rel="noopener noreferrer">Open ↗</a></div></div><div class="actions" style="margin-top:15px">'+controls+'<button class="btn ghost" id="refresh-detail">↻ Refresh</button></div><div class="divider"></div><div class="section-head"><h3>Execution timeline</h3><span class="muted" style="font-size:10px">'+events.length+' events</span></div><div class="events">'+eventHtml+'</div><div class="divider"></div><div class="section-head"><h3>Follow-up instruction</h3><span class="eyebrow">Send to agent</span></div><form id="followup-form" class="composer"><textarea id="followup-message" maxlength="12000" required placeholder="Add context, clarify an acceptance criterion or ask OpenHands to continue…"></textarea><div class="actions"><button class="btn primary" type="submit" '+(!running?'disabled':'')+'>Send message ↗</button><span class="muted" style="font-size:10px;align-self:center">'+(!running?'Resume the sandbox before sending a message.':'This sends a new instruction to the selected conversation.')+'</span></div></form>';
 var refresh=$("refresh-detail");if(refresh)refresh.addEventListener("click",function(){openConversation(id);});
 var pause=$("pause-conversation");if(pause)pause.addEventListener("click",function(){changeSandbox(id,"pause");});
 var resume=$("resume-conversation");if(resume)resume.addEventListener("click",function(){changeSandbox(id,"resume");});
 var follow=$("followup-form");if(follow)follow.addEventListener("submit",sendFollowup);
 }catch(e){$("detail-panel").innerHTML='<div class="empty"><strong>Could not load this conversation</strong>'+esc(e.message)+'</div>';toast(e.message,true);}
}
async function changeSandbox(id,action){var label=action==="pause"?"pause":"resume";if(!confirm("Are you sure you want to "+label+" this OpenHands sandbox?"))return;try{await request("/api/conversations/"+encodeURIComponent(id)+"/"+action,{method:"POST",body:{}});toast("Sandbox "+(action==="pause"?"paused":"resumed")+".");await loadConversations();await openConversation(id);}catch(e){toast(e.message,true);}}
async function sendFollowup(e){e.preventDefault();var message=$("followup-message").value.trim();if(!message||!selectedId)return;var button=e.submitter||e.target.querySelector("button[type=submit]");button.disabled=true;button.innerHTML='<span class="spinner"></span> Sending';try{await request("/api/conversations/"+encodeURIComponent(selectedId)+"/messages",{method:"POST",body:{message:message}});$("followup-message").value="";toast("Follow-up sent to OpenHands.");await openConversation(selectedId);}catch(err){toast(err.message,true);}finally{if(button){button.disabled=false;button.textContent="Send message ↗";}}}
function findStartTaskId(value){if(!value||typeof value!=="object")return null;var keys=["start_task_id","startTaskId"];for(var i=0;i<keys.length;i++){if(typeof value[keys[i]]==="string")return value[keys[i]];}if(value.result){var found=findStartTaskId(value.result);if(found)return found;}if(value.data){var nested=findStartTaskId(value.data);if(nested)return nested;}return null;}
async function pollStartTask(){
 if(!startTaskId)return;try{var d=await request("/api/start-tasks/"+encodeURIComponent(startTaskId));$("task-result").textContent=JSON.stringify(d,null,2);var row=(d.tasks||d.start_tasks||d.data||[]);var status="PENDING";var first=Array.isArray(row)?row[0]:row;if(first&&typeof first==="object")status=String(first.status||first.state||first.execution_status||status).toUpperCase();$("task-progress-status").textContent=status;$("task-progress-message").textContent="Startup status refreshed. Check the conversations page for the new sandbox.";if(/COMPLET|SUCCESS|RUNNING|FAILED|ERROR/.test(status))loadConversations();}catch(e){$("task-progress-message").textContent=e.message;toast(e.message,true);}
}
$("start-form").addEventListener("submit",async function(e){
 e.preventDefault();var instructions=$("task-instructions").value.trim();if(instructions.length<10){toast("Please enter at least 10 characters of instructions.",true);return;}if(!$("task-confirm").checked){toast("Confirm sandbox creation before starting.",true);return;}
 if(!confirm("Start this task in DigvijayPatel/LifeSort? This creates an OpenHands sandbox and may consume account resources."))return;
 var button=$("start-submit");button.disabled=true;button.innerHTML='<span class="spinner"></span> Starting…';$("task-progress").style.display="block";$("task-progress-status").textContent="SUBMITTING";$("task-progress-message").textContent="Sending instructions to OpenHands…";$("task-result").textContent="";
 try{var body={task:instructions};var title=$("task-title").value.trim();var branch=$("task-branch").value.trim();if(title)body.title=title;if(branch)body.branch=branch;var result=await request("/api/tasks/start",{method:"POST",body:body});startTaskId=findStartTaskId(result);$("task-result").textContent=JSON.stringify(result,null,2);$("task-progress-status").textContent=startTaskId?"STARTING":"SUBMITTED";$("task-progress-message").textContent=startTaskId?"OpenHands accepted the task. Polling its startup status…":"OpenHands accepted the request. Refresh Conversations to find the created task.";toast("Task submitted to OpenHands.");loadConversations();if(startTaskId){pollStartTask();}else{setTimeout(loadConversations,5000);}}catch(err){$("task-progress-status").textContent="FAILED";$("task-progress-message").textContent=err.message;toast(err.message,true);}finally{button.disabled=false;button.textContent="Start task ↗";}
});
$("task-refresh").addEventListener("click",pollStartTask);
$("refresh-list").addEventListener("click",loadConversations);
$("conversation-search").addEventListener("input",renderLists);
$("logout").addEventListener("click",async function(){if(!confirm("Sign out of the LifeSort control centre?"))return;try{await request("/api/logout",{method:"POST",body:{}});}catch(e){}location.href="/app";});
loadAccount();loadConversations();
if("serviceWorker" in navigator){navigator.serviceWorker.register("/sw.js").catch(function(){});}
if("serviceWorker" in navigator&&"BeforeInstallPromptEvent" in window){window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();});}
})();
</script>
</body>
</html>\`;
}
