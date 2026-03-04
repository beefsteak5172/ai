
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
  var root=document.getElementById('root');
  if(root)root.style.display='none';
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
    +'</div>';
  document.body.appendChild(d);
  setTimeout(function(){
    var b=document.getElementById('tlb'),p=document.getElementById('tlp'),u=document.getElementById('tlu');
    if(b)b.onclick=doLogin;
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
    var root=document.getElementById('root');if(root)root.style.display='';
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

(async function(){
  var token=localStorage.getItem(TK);
  if(!token){showLogin();return;}
  var r=await cw('/api/auth/verify',{},token);
  if(r.ok){patch(token);}
  else{localStorage.removeItem(TK);localStorage.removeItem(TU);showLogin('Session expired, please sign in again');}
})();
