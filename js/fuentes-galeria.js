/* ===== TEXTMUY GALERIA DE FUENTES — panel acoplado izquierda =====
 * API: window.TextMuyGaleriaFuentes.abrir(aplicar)
 * Replica el patron visual de galeria.js (tt-galpanel-*): buscador, tabs por
 * categoria (dinamicas: catalogo + puente), tiles con preview renderizada
 * (FontLoader.renderFontPreview) o sprite global scope 'fuentes', upload de
 * .ttf/.otf/.woff/.woff2, footer con nombre+categoria+Save/Delete/Select.
 * CRUD fisico SOLO con puente (handlers del plugin: subirFuente/borrarFuente
 * + moverFuente para renombrar/cambiar categoria; standalone = lectura).
 */
(function() {
'use strict';
function PM(){return window.PresetManager;}
function FL(){return window.FontLoader;}
function bridgeOK(){return !!(PM()&&PM().bridgeAvailable&&PM().bridgeAvailable());}
function el(c,t,txt){const n=document.createElement(t||'div');n.className=c;if(txt!==undefined)n.textContent=txt;return n;}
let panel=null;
let fuentesSpriteInfo=null;
let avisoCatalogo='';
function cargarSpriteFuentes(){
 if(!window.ThumbEngine||!FL()||!FL().ensureFontsSprite)return Promise.resolve(null);
 return FL().ensureFontsSprite().then(function(res){
  if(!res)return null;
  return new Promise(function(resolve){
   const img=new Image();
   img.onload=function(){fuentesSpriteInfo={spriteImage:img,manifest:res.manifest,spriteUrl:res.spriteUrl};resolve(fuentesSpriteInfo);};
   img.onerror=function(){resolve(null);};
   img.src=res.spriteUrl;
  });
 }).catch(function(){return null;});
}
function abrir(aplicar){if(!panel)panel=crearPanel();panel.abrir(aplicar);}
function crearPanel(){
 const ov=el('tt-galpanel');
 ov.hidden=true;
 ov.innerHTML=
  '<div class="tt-galpanel-caja">'+
  '<div class="tt-galpanel-toolbar">'+
  '<input type="text" class="tt-galpanel-search" placeholder="Buscar fuente...">'+
  '<button type="button" class="tt-galpanel-close">X</button></div>'+
  '<div class="tt-galpanel-tabs"></div>'+
  '<label class="tt-galpanel-upload">Subir fuente<input type="file" accept=".ttf,.otf,.woff,.woff2" hidden></label>'+
  '<div class="tt-galpanel-list"></div>'+
  '<div class="tt-galpanel-foot">'+
  '<input type="text" class="tt-galpanel-name" placeholder="Nombre...">'+
  '<select class="tt-galpanel-cat"></select>'+
  '<button type="button" class="tt-galpanel-btn tt-galpanel-newcat">+ Categoria</button>'+
  '<div class="tt-galpanel-foot-btns">'+
  '<button type="button" class="tt-galpanel-btn tt-galpanel-save" hidden>Save</button>'+
  '<button type="button" class="tt-galpanel-btn tt-galpanel-del" hidden>Delete</button>'+
  '<button type="button" class="tt-galpanel-btn tt-galpanel-sel">Select</button>'+
  '</div></div>'+
  '<div class="tt-galpanel-status"></div></div>';
 document.body.appendChild(ov);
 const search=ov.querySelector('.tt-galpanel-search');
 const closeBtn=ov.querySelector('.tt-galpanel-close');
 const tabs=ov.querySelector('.tt-galpanel-tabs');
 const uploadLabel=ov.querySelector('.tt-galpanel-upload');
 const uploadInput=uploadLabel.querySelector('input');
 const list=ov.querySelector('.tt-galpanel-list');
 const nameIn=ov.querySelector('.tt-galpanel-name');
 const catSel=ov.querySelector('.tt-galpanel-cat');
 const newCatBtn=ov.querySelector('.tt-galpanel-newcat');
 const saveBtn=ov.querySelector('.tt-galpanel-save');
 const delBtn=ov.querySelector('.tt-galpanel-del');
 const selBtn=ov.querySelector('.tt-galpanel-sel');
 const status=ov.querySelector('.tt-galpanel-status');
 let items=[];
 let seleccionado=null;
 let fuenteActual='todas';
 let aplicarActual=null;
 function categorias(){
  const set={};
  items.forEach(function(it){set[it.categoria||'custom']=1;});
  return Object.keys(set).sort();
 }
 function montarTabs(){
  tabs.innerHTML='';
  ['todas'].concat(categorias()).forEach(function(f){
   const b=el('tt-galpanel-tab','button',f==='todas'?'todas':f);
   b.type='button';
   if(f===fuenteActual)b.classList.add('on');
   b.addEventListener('click',function(){fuenteActual=f;render();});
   tabs.appendChild(b);
  });
 }
 function cargar(){
  items=[];seleccionado=null;avisoCatalogo='';
  // Catalogo unico numerico (fonts.json): ids ok con titulo/cats.
  // Invalid -> salto + warn + contador (higiene de listado, Const VI).
  // Free (tombstone) -> ocultas.
  const cats=(FL()&&FL().getFontCategories)?FL().getFontCategories():{};
  try{
   const inv=(FL()&&FL().getCatalogInvalidas)?FL().getCatalogInvalidas():[];
   const libres=(FL()&&FL().getCatalogLibres)?FL().getCatalogLibres():[];
   if((inv&&inv.length)||(libres&&libres.length)){
    (inv||[]).forEach(function(iv){try{console.warn('fonts:'+iv.reason+' (entrada saltada)');}catch(_){}});
    const idsInv=(inv||[]).map(function(iv){var m=/^fonts:(\d+):/.exec(iv.reason||'');return m?m[1]:null;}).filter(Boolean);
    avisoCatalogo=(libres&&libres.length?libres.length+' libres':'')+((libres&&libres.length&&(idsInv.length))?', ':'')+(idsInv.length?idsInv.length+' invalidas: ids '+idsInv.join(', '):'');
   }
  }catch(_){}
  Object.keys(cats).forEach(function(c){
   (cats[c]||[]).forEach(function(id){
    let ent=null;
    try{ent=(FL().getCatalogFonts()||{})[id];}catch(_){}
    if(!ent||!ent.file)return; // tombstone/invalid nunca llegan aqui
    const tit=ent&&ent.titulo?ent.titulo:('#'+id);
    const online=!!ent.online;
    items.push({slug:id,titulo:tit,src:'',categoria:c,enUso:false,tipo:'catalogo',online:online,fontId:id});
   });
  });
  if(FL()&&FL().listServerFonts){
   FL().listServerFonts().forEach(function(f){
    items.push({slug:f.key,titulo:f.titulo||f.nombre,src:f.url||'',categoria:f.categoria||'custom',enUso:false,tipo:'server',serverFile:f.nombre,fontKey:f.key});
   });
  }
  const q=(search.value||'').toLowerCase();
  if(q)items=items.filter(function(i){return (i.slug+' '+(i.titulo||'')).toLowerCase().indexOf(q)>=0;});
  if(fuenteActual!=='todas')items=items.filter(function(i){return (i.categoria||'custom')===fuenteActual;});
  montarTabs();
  ocultarUpload(!bridgeOK());
  status.textContent=avisoCatalogo||'';
  render();
  cargarSpriteFuentes().then(function(){render();});
 }
 function ocultarUpload(v){uploadLabel.hidden=v;}


 function render(){
  list.innerHTML='';
  if(!items.length){list.appendChild(el('tt-galpanel-empty','p','Sin resultados.'));rfFooter();return;}
  items.forEach(function(it){
   const t=el('tt-galpanel-tile','button');
   t.type='button';t.dataset.slug=it.slug;t.title=it.titulo;
   const tile=(window.ThumbEngine&&fuentesSpriteInfo&&fuentesSpriteInfo.manifest)
    ? window.ThumbEngine.tile(fuentesSpriteInfo.manifest,it.slug):null;
   if(tile){
    const cv=document.createElement('canvas');
    cv.width=180;cv.height=30;
    window.ThumbEngine.drawTile(cv.getContext('2d'),fuentesSpriteInfo.spriteImage,fuentesSpriteInfo.manifest,it.slug,0,0,180,30);
    t.appendChild(cv);
   }else if(FL()&&FL().renderFontPreview){
    t.appendChild(el('tt-galpanel-ph','span',it.titulo));
    FL().renderFontPreview({key:it.slug,name:it.titulo},180,30).then(function(cv){
     if(!t.isConnected)return;
     t.innerHTML='';t.appendChild(cv);
    }).catch(function(){});
   }
   t.addEventListener('click',function(){sel(it);});
   list.appendChild(t);
  });
  rfFooter();
 }
 function rfFooter(){
  const it=seleccionado;
  const esSv=!!(it&&it.tipo==='server');
  nameIn.value=it?it.titulo:'';
  nameIn.disabled=!esSv;
  catSel.innerHTML='';
  categorias().forEach(function(c){
   const o=document.createElement('option');
   o.value=c;o.textContent=c;
   catSel.appendChild(o);
  });
  if(it&&categorias().indexOf(it.categoria)===-1){
   const o=document.createElement('option');
   o.value=it.categoria;o.textContent=it.categoria;
   catSel.appendChild(o);
  }
  if(it)catSel.value=it.categoria;
  catSel.disabled=!esSv;
  newCatBtn.disabled=!esSv;
  saveBtn.hidden=!esSv;
  delBtn.hidden=!esSv;
  status.textContent=it?(it.tipo==='catalogo'?'Google Fonts (solo lectura)':''):'Selecciona una fuente';
 }
 function sel(it){
  seleccionado=it;
  list.querySelectorAll('.tt-galpanel-tile').forEach(function(t){t.classList.remove('sel');});
  try{
   const tile=list.querySelector('[data-slug="'+CSS.escape(it.slug)+'"]');
   if(tile)tile.classList.add('sel');
  }catch(_){}
  rfFooter();
 }

 function nuevaCategoria(){
  const nc=prompt('Nueva categoria:');
  if(!nc)return null;
  const clean=nc.trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'')||'custom';
  let found=false;
  Array.prototype.forEach.call(catSel.options,function(o){if(o.value===clean)found=true;});
  if(!found){
   const o=document.createElement('option');
   o.value=clean;o.textContent=clean;
   catSel.appendChild(o);
  }
  catSel.value=clean;
  return clean;
 }

 saveBtn.addEventListener('click',function(){
  const it=seleccionado;
  if(!it||it.tipo!=='server'||!PM())return;
  const nn=(nameIn.value.trim()||it.titulo).trim();
  const nc=(catSel.value||it.categoria||'custom').trim()||'custom';
  if(nn===it.titulo&&nc===it.categoria){status.textContent='Sin cambios.';return;}
  status.textContent='Guardando...';
  if(PM().moverFuente){
   PM().moverFuente(it,nn,nc).then(function(){status.textContent='Guardado.';saveBtn.hidden=true;cargar();}).catch(function(e){status.textContent=e.message;});
  }else{
   status.textContent='El plugin no expone moverFuente (actualiza manualmente).';
  }
 });
 delBtn.addEventListener('click',function(){
  const it=seleccionado;
  if(!it||it.tipo!=='server')return;
  if(!confirm('Borrar "'+it.titulo+'"?'))return;
  if(FL()&&FL().deleteCustomFont){
   const ok=FL().deleteCustomFont(it.fontKey);
   if(ok){status.textContent='Borrado.';seleccionado=null;if(FL().invalidateCatalog){try{FL().invalidateCatalog();}catch(_){}}cargar();}
   else status.textContent='No se pudo borrar.';
  }
 });
 newCatBtn.addEventListener('click',function(){
  if(!seleccionado||seleccionado.tipo!=='server')return;
  nuevaCategoria();
 });
 uploadInput.addEventListener('change',function(){
  const f=this.files&&this.files[0];this.value='';
  if(!f||!FL())return;
  if(!bridgeOK()){status.textContent='Requiere el plugin (iframe).';return;}
  status.textContent='Subiendo...';
  const base=(f.name||'fuente').replace(/\.[^/.]+$/,'');
  FL().uploadCustomFont(f,base).then(function(){
   status.textContent='Subida.';
   if(FL().invalidateCatalog){try{FL().invalidateCatalog().catch(function(){});}catch(_){}}
   cargar();
   if(window.ThumbEngine&&window.ThumbEngine.invalidate){try{window.ThumbEngine.invalidate('fuentes');}catch(_){}}
  }).catch(function(e){status.textContent=e.message;});
 });
 function abrirP(aplicar){
  aplicarActual=aplicar||null;
  search.value='';seleccionado=null;fuenteActual='todas';
  cargar();
  const main=document.getElementById('tt-main-container');
  if(main){main.dataset.galPrev=(main.style.display||'');main.style.display='none';}
  const tt=document.getElementById('tt')||document.body;
  if(ov.parentElement!==tt)tt.appendChild(ov);
  ov.hidden=false;
 }
 function cerrar(){
  ov.hidden=true;
  const main=document.getElementById('tt-main-container');
  if(main&&main.dataset.galPrev!==undefined){main.style.display=main.dataset.galPrev;delete main.dataset.galPrev;}
  aplicarActual=null;seleccionado=null;
 }
 closeBtn.addEventListener('click',function(){cerrar();});
 selBtn.addEventListener('click',function(){
  const it=seleccionado;
  if(!it||!aplicarActual){status.textContent='Selecciona primero.';return;}
  aplicarActual(it.slug,it);
  cerrar();
 });
 search.addEventListener('input',cargar);
 return{abrir:abrirP,cerrar:cerrar};
 }
 function abrir(aplicar){if(!panel)panel=crearPanel();panel.abrir(aplicar);}
 window.TextMuyGaleriaFuentes={abrir:abrir};
 })();
