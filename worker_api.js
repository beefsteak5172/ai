// worker_api.js - Worker API + Auth Guard

var WORKER_URL = 'https://tmenu-server.toastit2016.workers.dev';
async function callWorker(endpoint, data) {
    try {
        var resp = await fetch(WORKER_URL + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await resp.json();
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

// Worker API - KV sync + SSE + polling + backup
var WU='https://tmenu-server.toastit2016.workers.dev';
window._kvImages={};

async function cw(path,data,token){
  try{
    var h={'Content-Type':'application/json'};
    if(token)h['X-Auth-Token']=token;
    var r=await fetch(WU+path,{method:'POST',headers:h,body:JSON.stringify(data||{})});
    return await r.json();
  }catch(e){return{ok:false,error:e.message};}
}

function stripImages(menu){
  if(!Array.isArray(menu))return menu;
  return menu.map(function(cat){
    var c=JSON.parse(JSON.stringify(cat));
    if(c.items)c.items=c.items.map(function(it){
      var i=JSON.parse(JSON.stringify(it));
      if(i.image&&i.image.length>500){window._kvImages[i.id]=i.image;i.image='__KV__';}
      return i;
    });
    return c;
  });
}

async function loadConfigFromKV(){
  try{
    var r=await fetch(WU+'/api/config/get',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    var data=await r.json();
    if(data.ok){
      if(data.menu&&data.menu.length>0){
        var mn=stripImages(data.menu);
        try{localStorage.setItem('menuConfig',JSON.stringify(mn));}catch(e){}
      }
      if(data.addons)try{localStorage.setItem('addonsConfig',JSON.stringify(data.addons));}catch(e){}
      if(data.options)try{localStorage.setItem('optionsConfig',JSON.stringify(data.options));}catch(e){}
      window._kvMenuFull=data.menu;
      window._kvAddonsFull=data.addons;
      window._kvOptionsFull=data.options;
      window._kvSysConfigFull=data.sysConfig;
      console.log('[Worker] Config loaded from KV');
      return true;
    }
  }catch(e){console.warn('[Worker] KV load failed:',e.message);}
  return false;
}

function connectSSE(){
  try{
    var es=new EventSource(WU+'/api/events');
    es.addEventListener('update',function(e){
      console.log('[Worker] SSE update received');
      loadConfigFromKV().then(function(){
        if(typeof apiService!=='undefined')apiService.init();
      });
    });
    es.onerror=function(){es.close();setTimeout(connectSSE,30000);};
    console.log('[Worker] SSE connected');
  }catch(e){console.warn('[Worker] SSE failed:',e.message);}
}

var _workerRetry=0;
var _workerMaxRetry=33;

function workerInit(){
  if(typeof apiService==='undefined'||typeof idb==='undefined'){
    _workerRetry++;
    if(_workerRetry<=_workerMaxRetry){
      setTimeout(workerInit,300);
    }else{
      console.warn('[Worker] apiService/idb not found after 10s, giving up');
    }
    return;
  }

  console.log('[Worker] ready, retry='+_workerRetry);

  var os=apiService.submitOrder.bind(apiService);
  var ou=apiService.updateOrderStatus.bind(apiService);
  var om=apiService.saveMenuConfig.bind(apiService);
  apiService.submitOrder=async function(d){var r=await os(d);cw('/api/order',{action:'submit',order:d});return r;};
  apiService.updateOrderStatus=async function(id,s){var r=await ou(id,s);cw('/api/order',{action:'updateStatus',id:id,status:s});return r;};
  apiService.saveMenuConfig=async function(m,a,o,mt){var r=await om(m,a,o,mt);cw('/api/config/save',{menu:m,addons:a,options:o,groupMeta:mt});return r;};
  console.log('[Worker] apiService patched');

  loadConfigFromKV().then(function(){
    if(!window._kvMenuFull||!window._kvMenuFull.length)return;
    var w=[idb.set(STORES.MENU,'current',window._kvMenuFull)];
    if(window._kvAddonsFull)w.push(idb.set(STORES.ADDONS,'current',window._kvAddonsFull));
    if(window._kvOptionsFull)w.push(idb.set(STORES.OPTIONS,'current',window._kvOptionsFull));
    if(window._kvSysConfigFull)w.push(idb.set(STORES.SETTINGS,'current',{kiosk_config:window._kvSysConfigFull}));
    Promise.all(w).then(function(){apiService.init();});
  });

  connectSSE();

  setInterval(function(){
    try{apiService.getRawConfig().then(function(cfg){cw('/api/backup',{data:{menu:cfg.menu,addons:cfg.addons,options:cfg.options}});});}catch(e){}
  },10*60*1000);

  var _lastHash='';
  setInterval(function(){
    fetch(WU+'/api/config/version',{method:'GET'}).then(function(r){return r.json();}).then(function(d){
      if(d.hash&&d.hash!==_lastHash){_lastHash=d.hash;loadConfigFromKV().then(function(){if(typeof apiService!=='undefined')apiService.init();});}
    }).catch(function(){});
  },2*60*1000);
}

document.addEventListener('DOMContentLoaded',function(){workerInit();});

// Auth Guard + Login
var WU='https://tmenu-server.toastit2016.workers.dev';
var TK='tmenu_token',TU='tmenu_user';

async function cw(path,data,token){
  try{
    var h={'Content-Type':'application/json'};
    if(token)h['X-Auth-Token']=token;
    var r=await fetch(WU+path,{method:'POST',headers:h,body:JSON.stringify(data||{})});
    return await r.json();
  }catch(e){return{ok:false,error:e.message};}
}

function showLogin(err){
  var old=document.getElementById('tl');if(old)old.remove();
  var d=document.createElement('div');d.id='tl';
  d.style.cssText='position:fixed;inset:0;background:linear-gradient(135deg,#0f172a,#1e3a5f);display:flex;align-items:center;justify-content:center;z-index:999999;font-family:system-ui,sans-serif;';
  d.innerHTML='<div style="background:#fff;border-radius:1.5rem;padding:2.5rem;width:340px;box-shadow:0 30px 60px rgba(0,0,0,0.5);text-align:center;">'
    +'<div style="font-size:2.5rem;margin-bottom:0.5rem;">&#x1F354;</div>'
    +'<h2 style="font-size:1.4rem;font-weight:900;color:#1e293b;margin:0 0 0.25rem;">tmenu POS</h2>'
    +'<p style="color:#64748b;font-size:0.85rem;margin:0 0 1.5rem;">Please sign in to continue</p>'
    +(err?'<div style="background:#fef2f2;color:#dc2626;padding:0.75rem;border-radius:0.6rem;font-size:0.85rem;margin-bottom:1rem;">'+err+'</div>':'')
    +'<input id="tlu" type="text" placeholder="Username" style="width:100%;padding:0.85rem;border:2px solid #e2e8f0;border-radius:0.75rem;font-size:0.95rem;margin-bottom:0.75rem;box-sizing:border-box;"/>'
    +'<input id="tlp" type="password" placeholder="Password" style="width:100%;padding:0.85rem;border:2px solid #e2e8f0;border-radius:0.75rem;font-size:0.95rem;margin-bottom:1.25rem;box-sizing:border-box;"/>'
    +'<button id="tlb" style="width:100%;padding:0.9rem;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border:none;border-radius:0.75rem;font-size:1rem;font-weight:700;cursor:pointer;">Sign In</button>'
    +'<button id="tlc" style="width:100%;padding:0.6rem;margin-top:0.75rem;background:transparent;color:#94a3b8;border:none;font-size:0.85rem;cursor:pointer;">Cancel</button>'
    +'</div>';
  document.body.appendChild(d);
  setTimeout(function(){
    var b=document.getElementById('tlb'),p=document.getElementById('tlp'),u=document.getElementById('tlu'),c=document.getElementById('tlc');
    if(b)b.onclick=doLogin;
    if(c)c.onclick=function(){d.remove();};
    if(p)p.onkeydown=function(e){if(e.key==='Enter')doLogin();};
    if(u){u.onkeydown=function(e){if(e.key==='Enter')document.getElementById('tlp').focus();};u.focus();}
  },50);
}

async function doLogin(){
  var b=document.getElementById('tlb');
  var u=(document.getElementById('tlu').value||'').trim();
  var p=(document.getElementById('tlp').value||'').trim();
  if(!u||!p){showLogin('Please enter username and password');return;}
  if(b){b.textContent='Signing in...';b.disabled=true;}
  var r=await cw('/api/auth/login',{username:u,password:p});
  if(r.ok&&r.token){
    localStorage.setItem(TK,r.token);
    localStorage.setItem(TU,JSON.stringify({username:r.username,role:r.role,store:r.store}));
    var ld=document.getElementById('tl');if(ld)ld.remove();
    window._authToken=r.token;
    patch(r.token);
  }else{showLogin(r.error||'Login failed');}
}

function patch(token){
  if(typeof apiService==='undefined'){setTimeout(function(){patch(token);},300);return;}
  var os=apiService.submitOrder.bind(apiService);
  var ou=apiService.updateOrderStatus.bind(apiService);
  var om=apiService.saveMenuConfig.bind(apiService);
  apiService.submitOrder=async function(d){var r=await os(d);cw('/api/order',{action:'submit',order:d},token);return r;};
  apiService.updateOrderStatus=async function(id,s){var r=await ou(id,s);cw('/api/order',{action:'updateStatus',id:id,status:s},token);return r;};
  apiService.saveMenuConfig=async function(m,a,o,mt){var r=await om(m,a,o,mt);cw('/api/config/save',{menu:m,addons:a,options:o,groupMeta:mt},token);return r;};
  setInterval(function(){
    try{var data={};for(var k in localStorage){if(localStorage.hasOwnProperty(k))data[k]=localStorage.getItem(k);}cw('/api/backup',{data:data},token);}catch(e){}
  },10*60*1000);
  console.log('[Auth] apiService patched');
}

function interceptAdminEntry(){
  var _origDblClick=null;
  document.addEventListener('dblclick',function(e){
    var el=e.target;
    while(el&&el!==document.body){
      if(el.querySelector&&el.querySelector('h1.text-4xl')){
        var token=localStorage.getItem(TK);
        if(!token){
          e.stopImmediatePropagation();
          showLogin();
          return;
        }
        cw('/api/auth/verify',{},token).then(function(r){
          if(!r.ok){
            localStorage.removeItem(TK);localStorage.removeItem(TU);
            showLogin('Session expired, please sign in again');
          }
        });
        return;
      }
      el=el.parentElement;
    }
  },true);
}

(async function(){
  var token=localStorage.getItem(TK);
  if(token){
    var r=await cw('/api/auth/verify',{},token);
    if(r.ok){window._authToken=token;patch(token);}
    else{localStorage.removeItem(TK);localStorage.removeItem(TU);}
  }
  interceptAdminEntry();
})();
