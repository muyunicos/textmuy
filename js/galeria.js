/* ===== TEXTMUY GALERIA - panel acoplado izquierda =====
 * API: window.TextMuyGaleria.abrir(fuente, aplicar)
 *   fuente: 'bgs'|'icons'|'misc' (server) | 'presets' | 'catalogo:iconos'|'catalogo:fondos'
 */
(function(){
'use strict';
const CATS=['fondos','iconos','varios'];
const ALL_TABS=CATS;
let panel=null;
function PM(){return window.PresetManager;}
function bridgeOK(){return !!(PM()&&PM().bridgeAvailable&&PM().bridgeAvailable());}
function el(c,t,txt){const n=document.createElement(t||'div');n.className=c;if(txt!==undefined)n.textContent=txt;return n;}

function abrir(fuente,aplicar,seccion,opciones){
 if(!panel)panel=crearPanel();
 panel.abrir(fuente,aplicar,seccion,opciones);
}

function crearPanel(){
 const ov=el('tt-galpanel');
 ov.hidden=true;
 ov.innerHTML=
  '<div class="tt-galpanel-caja">'+
  '<div class="tt-galpanel-toolbar">'+
  '<input type="text" class="tt-galpanel-search" placeholder="Buscar...">'+
  '<button type="button" class="tt-galpanel-close">\u00d7</button></div>'+
  '<div class="tt-galpanel-tabs"></div>'+
  '<label class="tt-galpanel-upload">Upload<input type="file" accept="image/*" hidden></label>'+
  '<div class="tt-galpanel-list"></div>'+
  '<div class="tt-galpanel-ctrls" hidden></div>'+
  '<div class="tt-galpanel-foot">'+
  '<input type="text" class="tt-galpanel-name" placeholder="Nombre...">'+
  '<select class="tt-galpanel-cat"></select>'+
  '<div class="tt-galpanel-foot-btns">'+
  '<button type="button" class="tt-galpanel-btn tt-galpanel-save" hidden>Save</button>'+
  '<button type="button" class="tt-galpanel-btn tt-galpanel-del" hidden>Delete</button>'+
  '<button type="button" class="tt-galpanel-btn tt-galpanel-sel">Select</button>'+
  '</div></div>'+
  '<div class="tt-galpanel-status"></div></div>';
 document.body.appendChild(ov);
 const search=ov.querySelector('.tt-galpanel-search');
 const tabs=ov.querySelector('.tt-galpanel-tabs');
 const uploadLabel=ov.querySelector('.tt-galpanel-upload');
 const uploadInput=uploadLabel.querySelector('input');
 const list=ov.querySelector('.tt-galpanel-list');
 const nameIn=ov.querySelector('.tt-galpanel-name');
 const catSel=ov.querySelector('.tt-galpanel-cat');
 const saveBtn=ov.querySelector('.tt-galpanel-save');
 const delBtn=ov.querySelector('.tt-galpanel-del');
 const selBtn=ov.querySelector('.tt-galpanel-sel');
 const status=ov.querySelector('.tt-galpanel-status');
 const closeBtn=ov.querySelector('.tt-galpanel-close');
 tabs.appendChild(uploadLabel); // Upload comparte fila con los tabs
 let fuenteActual='misc',aplicarActual=null,items=[],seleccionado=null;
 let previewOpts=null;
 const ctrlsArea=ov.querySelector('.tt-galpanel-ctrls');

 function montarControles(ctr){
  ctrlsArea.innerHTML='';
  if(!ctr) return;
  if(ctr.type==='pattern'){
   const row1=el('tt-galpanel-ctrl-row');
   const fitLbl=el('','span','Fit: ');fitLbl.style.cssText='font-size:11px;margin-right:4px;';
   const fitSel=document.createElement('select');fitSel.className='tt-galpanel-cat';
   [['stretch','stretch'],['fit','fit'],['fill','fill']].forEach(function(f){const o=document.createElement('option');o.value=f[0];o.textContent=f[1];fitSel.appendChild(o);});
   fitSel.value=ctr.current.fit||'fill';
   fitSel.addEventListener('change',function(){ctr.onChange('fit',this.value);});
   row1.appendChild(fitLbl);row1.appendChild(fitSel);
   const scaleLbl=el('','span',' Scale: ');scaleLbl.style.cssText='font-size:11px;margin-left:8px;margin-right:4px;';
   const scaleIn=document.createElement('input');scaleIn.type='range';scaleIn.min='10';scaleIn.max='100';scaleIn.step='5';
   scaleIn.value=Math.round((ctr.current.scale!==undefined?ctr.current.scale:1)*100);
   scaleIn.style.cssText='flex:1;';
   const scaleBub=el('','span',scaleIn.value+'%');scaleBub.style.cssText='font-size:11px;margin-left:4px;';
   scaleIn.addEventListener('input',function(){scaleBub.textContent=this.value+'%';ctr.onChange('scale',parseFloat(this.value)/100);});
   row1.appendChild(scaleLbl);row1.appendChild(scaleIn);row1.appendChild(scaleBub);
   ctrlsArea.appendChild(row1);
   const row2=el('tt-galpanel-ctrl-row');
   const repLbl=el('','span','Repeat: ');repLbl.style.cssText='font-size:11px;margin-right:4px;';
   const repSel=document.createElement('select');repSel.className='tt-galpanel-cat';
   [['repeat','repeat'],['no-repeat','no-repeat']].forEach(function(r){const o=document.createElement('option');o.value=r[0];o.textContent=r[1];repSel.appendChild(o);});
   repSel.value=ctr.current.repeat||'repeat';
   repSel.addEventListener('change',function(){ctr.onChange('repeat',this.value);});
   row2.appendChild(repLbl);row2.appendChild(repSel);
   const posLbl=el('','span',' Origin: ');posLbl.style.cssText='font-size:11px;margin-left:8px;margin-right:4px;';
   row2.appendChild(posLbl);
   const POSITIONS=[['left top','center top','right top'],['left center','center','right center'],['left bottom','center bottom','right bottom']];
   const grid=el('','div');grid.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:2px;width:54px;';
   POSITIONS.forEach(function(rowOpts){
    rowOpts.forEach(function(pos){
     const cell=document.createElement('button');cell.type='button';cell.title=pos;
     cell.style.cssText='width:16px;height:16px;padding:0;border:1px solid #555;cursor:pointer;';
     if((ctr.current.position||'center')===pos){cell.style.background='var(--tt-accent,#0089ff)';}
     cell.addEventListener('click',function(){
      grid.querySelectorAll('button').forEach(function(b){b.style.background='';});
      cell.style.background='var(--tt-accent,#0089ff)';
      ctr.onChange('position',pos);
     });
     grid.appendChild(cell);
    });
   });
   row2.appendChild(grid);
   const rep2=el('','span',' Repeat: ');rep2.style.cssText='font-size:11px;margin-left:8px;margin-right:4px;';
   row2.insertBefore(rep2,grid); // repeat antes de origin
   ctrlsArea.appendChild(row2);
  }else if(ctr.type==='background'){
   const row=el('tt-galpanel-ctrl-row');
   const lbl=el('','span','Opacity: ');lbl.style.cssText='font-size:11px;margin-right:4px;';
   const inp=document.createElement('input');inp.type='range';inp.min='0';inp.max='1';inp.step='0.01';inp.value=ctr.current.alpha!==undefined?ctr.current.alpha:1;
   inp.style.cssText='flex:1;';
   inp.addEventListener('input',function(){ctr.onChange('alpha',parseFloat(this.value));});
   row.appendChild(lbl);row.appendChild(inp);
   const rep=el('','span',' Repeat: ');rep.style.cssText='font-size:11px;margin-left:8px;margin-right:4px;';
   const repSel=document.createElement('select');repSel.className='tt-galpanel-cat';
   [['repeat','repeat'],['no-repeat','no-repeat']].forEach(function(r){const o=document.createElement('option');o.value=r[0];o.textContent=r[1];repSel.appendChild(o);});
   repSel.value=ctr.current.repeat||'repeat';
   repSel.addEventListener('change',function(){ctr.onChange('repeat',this.value);});
   row.appendChild(rep);row.appendChild(repSel);
   ctrlsArea.appendChild(row);
  }
 }

 async function cargar(){
  list.innerHTML='';status.textContent='';items=[];
  const q=(search.value||'').toLowerCase();
  if(fuenteActual==='presets'){
   const nombres=PM()?PM().listPresets():[];
   for(const n of nombres){
    if(q&&n.toLowerCase().indexOf(q)<0)continue;
    items.push({slug:n,titulo:n,src:'',tipo:'preset'});
   }
   montarTabs();ocultarUpload(true);render();
   for(const it of items){
    if(PM()&&PM().ensureThumbnail){
     const u=await PM().ensureThumbnail(it.slug);
     if(u){it.src=u;actImg(it);}
    }
   }
   return;
  }
  // Fondos e iconos fusionan server + catalogo. Varios es solo server.
  if(!PM()||!PM().listImages){status.textContent='Galeria no disponible.';return;}
  if(!bridgeOK()){status.textContent='Requiere el plugin (iframe).';return;}
  let imgs=PM().listImages(fuenteActual);
  if(q)imgs=imgs.filter(function(i){return (i.nombre+' '+(i.titulo||'')).toLowerCase().indexOf(q)>=0;});
  for(const i of imgs){items.push({slug:i.nombre,titulo:i.titulo||i.nombre,src:i.url,categoria:i.categoria,enUso:i.enUso,tipo:'server'});}
  montarTabs();ocultarUpload(false);render();
 }

 function actImg(it){
  const t=list.querySelector('[data-slug="'+it.slug+'"]');
  if(t){const img=t.querySelector('img');if(img&&it.src)img.src=it.src;}
 }

 function montarTabs(){
  tabs.innerHTML='';
  ALL_TABS.forEach(function(f){
   const b=el('tt-galpanel-tab','button',f.replace('catalogo:','cat '));
   b.type='button';
   if(f===fuenteActual)b.classList.add('on');
   b.addEventListener('click',function(){fuenteActual=f;search.value='';seleccionado=null;rfFooter();cargar();});
   tabs.appendChild(b);
  });
  tabs.appendChild(uploadLabel); // Upload al final de la fila
 }

 function ocultarUpload(v){uploadLabel.hidden=v;}

 function render(){
  list.innerHTML='';
  if(!items.length){list.appendChild(el('tt-galpanel-empty','p','Sin resultados.'));rfFooter();return;}
  items.forEach(function(it){
   const t=el('tt-galpanel-tile','button');
   t.type='button';t.dataset.slug=it.slug;t.title=it.titulo;
   const img=document.createElement('img');
   img.loading='lazy';img.alt=it.titulo;
   if(it.src)img.src=it.src;
   t.appendChild(img);
   if(it.enUso)t.appendChild(el('tt-galpanel-enuso','span','\u25cf'));
   t.addEventListener('click',function(){sel(it);});
   list.appendChild(t);
  });
  rfFooter();
 }

 function sel(it){
  seleccionado=it;
  list.querySelectorAll('.tt-galpanel-tile').forEach(function(t){t.classList.remove('sel');});
  const tile=list.querySelector('[data-slug="'+it.slug+'"]');
  if(tile)tile.classList.add('sel');
  // En preview mode: aplicar inmediatamente (live preview)
  if(previewOpts&&previewOpts.preview&&aplicarActual){
   aplicarActual(it.src,it);
  }
  rfFooter();
 }

 function rfFooter(){
  const it=seleccionado;
  nameIn.value=it?(it.titulo||it.slug):'';
  catSel.innerHTML='';
  const esSv=it&&it.tipo==='server';
  const esCat=it&&it.tipo==='catalogo';
  if(esSv){
   CATS.forEach(function(c){
    const o=document.createElement('option');o.value=c;o.textContent=c;
    if(c===(it.categoria||'varios'))o.selected=true;
    catSel.appendChild(o);
   });
   catSel.hidden=false;
  }else if(esCat){
   const o=document.createElement('option');o.value=it.slug;o.textContent='catalogo';
   catSel.appendChild(o);catSel.hidden=true;
  }else{catSel.hidden=true;}
  nameIn.disabled=!(esSv||esCat);
  saveBtn.hidden=true;
  delBtn.hidden=!esSv;
  status.textContent=it?(it.enUso?'En uso por presets':''):'Selecciona un elemento';
 }

 function hayCambios(){
  const it=seleccionado;
  if(!it)return false;
  const titulo=it.titulo||it.slug;
  if(it.tipo==='server')return nameIn.value!==it.slug||catSel.value!==(it.categoria||'varios');
  if(it.tipo==='catalogo')return nameIn.value!==titulo;
  return false;
 }
 nameIn.addEventListener('input',function(){saveBtn.hidden=!hayCambios();});
 catSel.addEventListener('change',function(){saveBtn.hidden=!hayCambios();});

 saveBtn.addEventListener('click',function(){
  const it=seleccionado;
  if(!it||!PM())return;
  const nn=nameIn.value.trim().toLowerCase().replace(/[^a-z0-9_.-]+/g,'-').replace(/^-+|-+$/g,'')||it.slug;
  status.textContent='Guardando...';
  if(it.tipo==='server'){
   const nc=catSel.value||'varios';
   PM().moverImagen(it,nn.replace(/\.[^.]+$/,''),nc).then(function(it2){
    it.slug=it2.nombre;it.src=it2.url;it.categoria=it2.categoria;
    status.textContent='Guardado.';saveBtn.hidden=true;fuenteActual=it2.categoria;cargar();
   }).catch(function(e){status.textContent=e.message;});
  }else if(it.tipo==='catalogo'){
   // Copia el asset del catalogo al server con el nombre elegido.
   fetch(it.src).then(function(r){return r.blob();}).then(function(blob){
    const ext=(it.src.split('.').pop()||'svg');
    const f=new File([blob],nn+'.'+ext,{type:blob.type||'image/svg+xml'});
    return PM().uploadImage(f,{categoria:fuenteActual,nombre:nn});
   }).then(function(){
    status.textContent='Copiado al servidor.';saveBtn.hidden=true;cargar();
   }).catch(function(e){status.textContent=e.message;});
  }
 });

 delBtn.addEventListener('click',function(){
  const it=seleccionado;
  if(!it||it.tipo!=='server'||!PM())return;
  const msg=it.enUso?'En uso por presets. Borrar los rompera. Continuar?':'Borrar "'+it.titulo+'"?';
  if(!confirm(msg))return;
  PM().deleteImage(it).then(function(){status.textContent='Borrado.';seleccionado=null;cargar();})
   .catch(function(e){status.textContent=e.message;});
 });


 uploadInput.addEventListener('change',function(){
  const f=this.files&&this.files[0];this.value='';
  if(!f||!PM())return;
  status.textContent='Subiendo...';
  PM().uploadImage(f,{categoria:fuenteActual}).then(function(){cargar();})
   .catch(function(e){status.textContent=e.message;});
 });

 function abrirP(fuente,aplicar,seccion,opciones){
  aplicarActual=aplicar;fuenteActual=fuente;
  previewOpts=opciones||{};
  search.value='';seleccionado=null;
  catSel.innerHTML='';catSel.hidden=true;
  // Controles (Pattern/Background)
  if(previewOpts.preview&&previewOpts.controls){
   montarControles(previewOpts.controls);
   ctrlsArea.hidden=false;
   selBtn.textContent=previewOpts.applyLabel||'Aplicar';
  }else{
   ctrlsArea.hidden=true;
   selBtn.textContent='Select';
  }
  cargar();
  // El panel ocupa SIEMPRE el espacio de tt-main-container
  var main=document.getElementById('tt-main-container');
  if(main){main.dataset.galPrev=(main.style.display||'');main.style.display='none';}
  var tt=document.getElementById('tt')||document.body;
  if(ov.parentElement!==tt)tt.appendChild(ov);
  ov.hidden=false;
 }
 function cerrar(apply){
  ov.hidden=true;
  var main=document.getElementById('tt-main-container');
  if(main&&main.dataset.galPrev!==undefined){main.style.display=main.dataset.galPrev;delete main.dataset.galPrev;}
  if(!apply&&previewOpts&&previewOpts.onCancel){previewOpts.onCancel();}
  aplicarActual=null;seleccionado=null;previewOpts=null;
 }
 closeBtn.addEventListener('click',function(){cerrar(false);});
 selBtn.addEventListener('click',function(){
  if(previewOpts&&previewOpts.preview){
   cerrar(true); // Aplicar: no revertir el live preview
   return;
  }
  const it=seleccionado;
  if(!it||!aplicarActual){status.textContent='Selecciona primero.';return;}
  aplicarActual(it.src,it);
  cerrar();
 });
 search.addEventListener('input',cargar);

 return{abrir:abrirP,cerrar:cerrar};
 }

window.TextMuyGaleria={abrir:abrir};
})();