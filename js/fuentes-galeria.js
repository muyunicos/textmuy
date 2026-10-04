/* ===== TEXTMUY GALERIA DE FUENTES — panel acoplado izquierda =====
 * API: window.TextMuyGaleriaFuentes.abrir(aplicar)
 * Replica el patron visual de galeria.js (tt-galpanel-*): buscador, tabs por
 * categoria (dinamicas: catalogo + puente), tiles desde la hoja CANONICA del
 * ambito (thumbs.webp leido por api.js::ensureSpriteCanonico, celda = id-1) y
 * upload .ttf/.otf/.woff/.woff2; footer nombre+categoria+Save/Delete/Select.
 * CRUD fisico SOLO con puente (op=alta|baja|editar del motor via
 * uploadCustomFont / deleteCustomFont / moverFuente).
 * Invariantes (RC35): (1) el manifiesto se indexa por nombre STRING y los ids
 * del catalogo son numeros: sin String() la busqueda del tile fallaba SIEMPRE y
 * toda ficha del catalogo caia al preview; (2) toda mutacion invalida la hoja
 * ANTES de listar y ESPERA la relectura de fonts.json (invalidateCatalog vacia
 * fontCategories de forma sincrona: listar antes dejaba la galeria solo con las
 * fisicas del registry y con la hoja vieja dibujada).
 * Invariantes (RC37): (3) CERO descargas de fuentes al abrir. Antes la galeria
 * pedia FontLoader.ensureFontsSprite(), y como ThumbEngine solo guarda el
 * manifiesto en memoria cada apertura regeneraba la hoja entera llamando a
 * renderFontPreview por cada item -> loadFont de las 15 fisicas (~1,4 MB) +
 * los tiles sin cobertura volvian a llamar a renderFontPreview. Hoy: la hoja se
 * LEE (y solo si esta certificada por thumbs.sprite_firma); sin hoja hay
 * placeholder de TEXTO y la generacion es explicita (boton "Generar
 * miniaturas"); (4) la fuente se descarga al SELECCIONARLA (1 archivo) y ahi
 * se pinta su preview real; (5) la geometria del tile la manda thumbs de
 * fonts.json (catalog.js::geometriaTiles), nunca 180x30 hardcodeado. */
(function() {
'use strict';
function PM(){return window.PresetManager;}
function FL(){return window.FontLoader;}
function bridgeOK(){return !!(PM()&&PM().bridgeAvailable&&PM().bridgeAvailable());}
function el(c,t,txt){const n=document.createElement(t||'div');n.className=c;if(txt!==undefined)n.textContent=txt;return n;}
let panel=null;
let fuentesSpriteInfo=null; // hoja CANONICA leida: {spriteImage,canon,spriteUrl}
let avisoCatalogo='';
let fuentesSpriteVersion=0;
if(typeof window.addEventListener==='function'){
 window.addEventListener('textmuy:sprite-invalidado',function(ev){
  if(ev.detail&&ev.detail.ambito==='fonts'){fuentesSpriteVersion++;fuentesSpriteInfo=null;}
 });
}
// La mutacion ya espero la invalidacion central y la relectura del catalogo.
function recargarTrasMutacion(cargar){return Promise.resolve().then(cargar);}
// RC37: la hoja de fuentes se LEE por la ruta canonica (thumbs.webp validado
// contra thumbs.sprite_firma del catalogo). NO se reconstruye aqui: ver el
// encabezado (invariante 3). Sin hoja certificada -> null y la galeria pinta
// placeholders (cero red); la generacion la dispara el usuario con el boton.
function cargarSpriteFuentes(){
 fuentesSpriteInfo=null;
 if(!window.TextMuyAPI||!window.TextMuyAPI.ensureSpriteCanonico)return Promise.resolve(null);
 const version=++fuentesSpriteVersion;
 return Promise.resolve(window.TextMuyAPI.ensureSpriteCanonico('fonts')).then(function(res){
  if(!res||!res.spriteImage||version!==fuentesSpriteVersion)return null;
  fuentesSpriteInfo={spriteImage:res.spriteImage,canon:res.canon,spriteUrl:res.spriteUrl};
  return fuentesSpriteInfo;
 }).catch(function(){return null;});
}
function abrir(aplicar){if(!panel)panel=crearPanel();panel.abrir(aplicar);}
function crearPanel(){
 const ov=el('tt-galpanel');
 ov.hidden=true;
 ov.dataset.ambito='fonts'; // CSS: proporcion y columna del tile (ver style.css)
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
  '<button type="button" class="tt-galpanel-btn tt-galpanel-gensprite" hidden title="Descarga las fuentes fisicas y arma el sprite de miniaturas del ambito (una sola vez)">Generar miniaturas</button>'+
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
 const genBtn=ov.querySelector('.tt-galpanel-gensprite');
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
  const archivosCat={}; // file fisico del catalogo: identidad para el dedupe
  Object.keys(cats).forEach(function(c){
   (cats[c]||[]).forEach(function(id){
    let ent=null;
    try{ent=(FL().getCatalogFonts()||{})[id];}catch(_){}
    if(!ent||!ent.file)return; // tombstone/invalid nunca llegan aqui
    archivosCat[ent.file]=true;
    const tit=ent&&ent.titulo?ent.titulo:('#'+id);
    const online=!!ent.online;
    items.push({slug:id,titulo:tit,src:'',categoria:c,enUso:false,tipo:'catalogo',online:online,fontId:id});
   });
  });
  if(FL()&&FL().listServerFonts){
   FL().listServerFonts().forEach(function(f){
    // Dedupe por identidad real (archivo fisico): una fuente subida en esta
    // sesion vive en el registry (serverFile) Y en el catalogo (id); sin esto
    // salia DOS veces en la lista (una como catalogo y otra como server).
    if(f.nombre&&archivosCat[f.nombre])return;
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


 // Geometria de la celda: la manda thumbs de fonts.json (unica fuente de
 // verdad). Sin catalogo leido queda la reticula documentada (180x30).
 function dimsTile(){
  const th=(FL()&&FL().getCatalogThumbs)?FL().getCatalogThumbs():null;
  const g=(window.TextMuyCatalog&&window.TextMuyCatalog.geometriaTiles)
   ?window.TextMuyCatalog.geometriaTiles(th):null;
  return g||{w:180,h:30,ratio:'6 / 1',col:162};
 }
 function pintarGeometria(){
  const g=dimsTile();
  list.style.setProperty('--tt-gal-ratio',g.ratio);
  list.style.setProperty('--tt-gal-col',g.col+'px');
  return g;
 }
 // La hoja solo se genera a pedido: es la unica ruta que descarga todas las
 // fuentes fisicas, asi que nunca se ofrece sin puente ni con hoja lista.
 function actualizarBotonHojas(){
  genBtn.hidden=!!(fuentesSpriteInfo||!bridgeOK()||!window.TextMuyAPI
   ||!window.TextMuyAPI.reconstruirSpriteCanonico);
 }
 // Tiles de la hoja canonica: por ID numerico del catalogo (celda = id-1).
 function render(){
  list.innerHTML='';
  pintarGeometria();
  if(!items.length){list.appendChild(el('tt-galpanel-empty','p','Sin resultados.'));rfFooter();actualizarBotonHojas();return;}
  items.forEach(function(it){
   const t=el('tt-galpanel-tile','button');
   t.type='button';t.dataset.slug=String(it.slug);t.title=it.titulo;
   // Hoja CANONICA leida (celda = id-1). Sin hoja certificada, o para items
   // que solo viven en el registry, queda el placeholder de TEXTO: cero red.
   // El preview real con el tipo de letra se pide al seleccionar (1 descarga).
   let celda=null;
   if(fuentesSpriteInfo&&window.TextMuyAPI&&window.TextMuyAPI.drawTileCanonico
    &&typeof it.fontId==='number'&&it.fontId>=1){
    try{celda=window.TextMuyAPI.drawTileCanonico('fonts',it.fontId);}catch(_){celda=null;}
   }
   if(celda)t.appendChild(celda);
   else t.appendChild(el('tt-galpanel-ph','span',it.titulo));
   t.addEventListener('click',function(){sel(it);});
   list.appendChild(t);
  });
  rfFooter();
  actualizarBotonHojas();
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
 // RC39 (001-fix-bugs-01): la fuente explorada se aplica al LIENZO de
 // inmediato, sin pasar por "Select" (FR-007). Es una previsualizacion
 // temporal: no toca el estado del proyecto, y cerrar la galeria sin
 // confirmar la revierte (R-C5.1, R-C5.4).
 let previa=null;   // referencia de la fuente previa del proyecto
 // FR-034: cada tipo de entrada de la galeria nombra su identidad en un campo
 // distinto: las de catalogo usan `fontId` y las subidas en la sesion usan
 // `fontKey`. El preview leia `it.id`, que NINGUNA entrada tiene, asi que
 // llegaba undefined y la previsualizacion no aplicaba nada ("referencia
 // vacia"). Se lee el campo que corresponda a cada tipo.
 function identidadDeEntrada(it){
  if(!it)return null;
  // Catalogo: identidad numerica del catalogo.
  if(typeof it.fontId==='number'&&it.fontId>=1)return it.fontId;
  // Subida en la sesion: la clave del registro, que se traduce a identidad.
  if(it.fontKey)return it.fontKey;
  // Tolerancia con otras formas (id o slug numerico).
  if(typeof it.id==='number'&&it.id>=1)return it.id;
  if(typeof it.slug==='number'&&it.slug>=1)return it.slug;
  return it.slug||it.id||null;
 }
 function previsualizarEnLienzo(it){
  const ed=window.TextEditor;
  if(!ed||!ed.getSettings)return;
  const ref=identidadDeEntrada(it);
  if(ref===null||ref===undefined||ref===''){
   status.textContent='Esta fuente todavia no tiene identidad: no se puede previsualizar.';
   return;
  }
  if(!previa) previa={anterior:ed.getSettings().font?ed.getSettings().font.src:null};
  // Resolver a identidad con el criterio del resto del modulo.
  let id=ref;
  if(FL()&&FL().resolveFontId){
   try{id=FL().resolveFontId(ref);}
   catch(_){
    // FR-034: si no puede resolverse NO se aplica en silencio.
    status.textContent='No se pudo identificar la fuente: elige otra.';
    return;
   }
  }
  if(ed.aplicarFuentePrevia) ed.aplicarFuentePrevia(id);
  if(!it.online)status.textContent='Descargando la fuente para la vista previa...';
 }
 // Revierte: el lienzo vuelve a la fuente que habia antes de explorar. Se
 // llama al cerrar la galeria sin confirmar (R-C5.3, FR-008). Una descarga
 // que termine despues de revertir NO repinta: la comparacion de identidad
 // en aplicarFuentePrevia lo impide.
 function revertirPrevisualizacion(){
  if(!previa)return;
  const ed=window.TextEditor;
  const anterior=previa.anterior;
  previa=null;
  if(ed&&ed.revertirFuentePrevia) ed.revertirFuentePrevia(anterior);
 }
 // Confirma: la fuente explorada pasa a ser la del proyecto; la
 // previsualizacion se cierra sin cambiar el lienzo (R-C5.5, FR-009).
 // Se suelta tambien la referencia de previsualizacion del editor, que es lo
 // que hacia que el lienzo siguiera usando la fuente explorada.
 function confirmarPrevisualizacion(){
  const ed=window.TextEditor;
  previa=null;
  if(ed&&ed.confirmarFuentePrevia) ed.confirmarFuentePrevia();
 }

 function sel(it){
  seleccionado=it;
  list.querySelectorAll('.tt-galpanel-tile').forEach(function(t){t.classList.remove('sel');});
  try{
   const tile=list.querySelector('[data-slug="'+CSS.escape(String(it.slug))+'"]');
   if(tile)tile.classList.add('sel');
  }catch(_){}
  rfFooter();
  previewSeleccionada(it);
  // RC39: la fuente se aplica ya al lienzo (no hace falta pulsar Select).
  previsualizarEnLienzo(it);
 }
 // Preview real SOLO de la fuente seleccionada: es el unico momento en que se
 // descarga su archivo (1 request). Antes se bajaban todas al abrir el panel.
 function previewSeleccionada(it){
  if(!FL()||!FL().renderFontPreview)return;
  let tile=null;
  try{tile=list.querySelector('[data-slug="'+CSS.escape(String(it.slug))+'"]');}catch(_){}
  if(!tile)return;
  const d=dimsTile();
  if(!it.online)status.textContent='Descargando la fuente para la vista previa...';
  FL().renderFontPreview({key:String(it.slug),name:it.titulo,online:!!it.online},d.w,d.h).then(function(cv){
   if(!tile.isConnected)return;
   tile.innerHTML='';tile.appendChild(cv);
   rfFooter();
  }).catch(function(){rfFooter();});
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
   PM().moverFuente(it,nn,nc).then(function(){
    status.textContent='Guardado.';saveBtn.hidden=true;
    // moverFuente ya invalido la hoja (op=editar); falta releer el catalogo
    // del modulo (titulo/categoria viejos) ANTES de listar.
    return recargarTrasMutacion(cargar);
   }).catch(function(e){status.textContent=e.message;});
  }else{
   status.textContent='El plugin no expone moverFuente (actualiza manualmente).';
  }
 });
 delBtn.addEventListener('click',function(){
  const it=seleccionado;
  if(!it||it.tipo!=='server')return;
  if(!confirm('Borrar "'+it.titulo+'"?'))return;
  if(!FL()||!FL().deleteCustomFont)return;
  status.textContent='Borrando...';
  // deleteCustomFont resuelve DESPUES de que el motor confirme la baja: recien
  // entonces la relectura de fonts.json deja de traer la tupla borrada.
  Promise.resolve(FL().deleteCustomFont(it.fontKey)).then(function(ok){
   if(!ok){status.textContent='No se pudo borrar.';return null;}
   status.textContent='Borrado.';seleccionado=null;
   return recargarTrasMutacion(cargar);
  }).catch(function(e){status.textContent=e.message;});
 });
 newCatBtn.addEventListener('click',function(){
  if(!seleccionado||seleccionado.tipo!=='server')return;
  nuevaCategoria();
 });
 // Generacion EXPLICITA de la hoja del ambito (invariante 3 del encabezado):
 // unica ruta que descarga las fuentes fisicas. Deja el catalogo certificado
 // (thumbs.sprite_firma) para que de aqui en mas la galeria solo lea el
 // thumbs.webp. Nunca se dispara sola al abrir el panel.
 genBtn.addEventListener('click',function(){
  if(!FL()||!window.TextMuyAPI||!window.TextMuyAPI.reconstruirSpriteCanonico)return;
  genBtn.disabled=true;
  status.textContent='Generando miniaturas (descarga las fuentes fisicas)...';
  const render=function(it,w,h){
   return FL().renderFontPreview({key:String(it.id||it.nombre),name:it.titulo||it.name,online:!!it.online},w,h);
  };
  Promise.resolve(window.TextMuyAPI.reconstruirSpriteCanonico('fonts',{render:render})).then(function(res){
   if(!res){status.textContent='No se pudo generar la hoja (sin puente o sin catalogo).';return null;}
   status.textContent='Miniaturas generadas.';
   if(PM()&&PM().invalidarSprite){
    return Promise.resolve(PM().invalidarSprite('fonts')).catch(function(){});
   }
   return null;
  }).then(function(){return recargarTrasMutacion(cargar);})
   .catch(function(e){status.textContent=(e&&e.message)||String(e);})
   .then(function(){genBtn.disabled=false;});
 });
 uploadInput.addEventListener('change',function(){
  const f=this.files&&this.files[0];this.value='';
  if(!f||!FL())return;
  if(!bridgeOK()){status.textContent='Requiere el plugin (iframe).';return;}
  status.textContent='Subiendo...';
  const base=(f.name||'fuente').replace(/\.[^/.]+$/,'');
  FL().uploadCustomFont(f,base).then(function(){
   status.textContent='Subida.';
   return recargarTrasMutacion(cargar);
  }).catch(function(e){status.textContent=e.message;});
 });
 function abrirP(aplicar){
  aplicarActual=aplicar||null;
  search.value='';seleccionado=null;fuenteActual='todas';
  cargar();
  // Apertura temprana: si fonts.json todavia no esta ledo, cargar() pinta
  // "Sin resultados" (lee el catalogo en memoria). Reintentar cuando termine
  // la lectura; si el panel se cerro antes, no se toca nada.
  if(!items.length&&FL()&&FL().loadCatalog){
   Promise.resolve(FL().loadCatalog()).then(function(){
    if(!ov.hidden&&FL().getFontCategories&&Object.keys(FL().getFontCategories()).length)cargar();
   }).catch(function(){});
  }
  const main=document.getElementById('tt-main-container');
  if(main){main.dataset.galPrev=(main.style.display||'');main.style.display='none';}
  const tt=document.getElementById('tt')||document.body;
  if(ov.parentElement!==tt)tt.appendChild(ov);
  ov.hidden=false;
 }
 function cerrar(){
  // RC39: cerrar sin confirmar REVIERTE la previsualizacion: el lienzo vuelve
  // a la fuente que tenia antes de explorar (FR-008, R-C5.3).
  revertirPrevisualizacion();
  ov.hidden=true;
  const main=document.getElementById('tt-main-container');
  if(main&&main.dataset.galPrev!==undefined){main.style.display=main.dataset.galPrev;delete main.dataset.galPrev;}
  aplicarActual=null;seleccionado=null;
 }
 closeBtn.addEventListener('click',function(){cerrar();});
 selBtn.addEventListener('click',function(){
  const it=seleccionado;
  if(!it||!aplicarActual){status.textContent='Selecciona primero.';return;}
  // Confirmar consolida la fuente: la previsualizacion se cierra y el lienzo
  // NO cambia, porque la fuente explorada ya es la que se quiere (FR-009).
  confirmarPrevisualizacion();
  aplicarActual(it.slug,it);
  cerrar();
 });
 search.addEventListener('input',cargar);
 return{abrir:abrirP,cerrar:cerrar};
 }
 function abrir(aplicar){if(!panel)panel=crearPanel();panel.abrir(aplicar);}
 window.TextMuyGaleriaFuentes={abrir:abrir};
 })();
