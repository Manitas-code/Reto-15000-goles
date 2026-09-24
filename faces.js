/* =====================================================================
   GOALDAY · caras de los jugadores
   FIX: fotos revisadas a mano (nombre -> URL). Mandan sobre todo lo demás.
   Si un jugador no está en FIX, se busca en Wikipedia y se guarda en caché.
   ===================================================================== */
(function(){
const FIX={};
// Títulos exactos de Wikipedia para nombres ambiguos
const TITLE={
 'Raúl':'Raúl González Blanco','Quini':'Enrique Castro González','Rodri':'Rodrigo Hernández Cascante',
 'Adriano':'Adriano Leite Ribeiro','Marcelo':'Marcelo Vieira','Gabigol':'Gabriel Barbosa',
 'Rodrygo':'Rodrygo Goes','Luis Enrique':'Luis Enrique Martínez García','Sócrates':'Sócrates (futbolista)',
 'Pauleta':'Pedro Pauleta','Deco':'Deco (futbolista)','Luis Díaz':'Luis Díaz (futbolista colombiano)',
 'David Silva':'David Silva (futbolista)','Bebeto':'Bebeto (futbolista)','Zico':'Zico (futbolista)'
};
const KEY='gd_faces_v2';
let cache={};try{cache=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(cache))}catch(e){}};
const API='https://es.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=400';
async function byTitles(names){
  const out={};
  for(let i=0;i<names.length;i+=50){
    const part=names.slice(i,i+50),titles=part.map(n=>TITLE[n]||n);
    try{
      const d=await (await fetch(API+'&titles='+encodeURIComponent(titles.join('|')))).json();
      const q=d.query||{},hop={};
      (q.normalized||[]).forEach(x=>hop[x.from]=x.to);(q.redirects||[]).forEach(x=>hop[x.from]=x.to);
      const img={};Object.values(q.pages||{}).forEach(p=>{if(p.thumbnail)img[p.title]=p.thumbnail.source});
      part.forEach((n,j)=>{let t=titles[j],k=0;while(hop[t]&&k++<3)t=hop[t];if(img[t])out[n]=img[t]});
    }catch(e){}
  }
  return out;
}
async function bySearch(name){
  try{
    const d=await (await fetch(API.replace('&redirects=1','')+'&generator=search&gsrlimit=1&gsrsearch='+encodeURIComponent(name+' futbolista'))).json();
    const p=d.query&&Object.values(d.query.pages)[0];return (p&&p.thumbnail&&p.thumbnail.source)||'';
  }catch(e){return ''}
}
async function batch(names){
  const res={},todo=[];
  names.forEach(n=>{if(FIX[n])res[n]=FIX[n];else if(n in cache)res[n]=cache[n];else todo.push(n)});
  if(todo.length){
    const got=await byTitles(todo);
    for(const n of todo){cache[n]=got[n]||await bySearch(n);res[n]=cache[n]}
    save();
  }
  return res;
}
window.GD_face=name=>batch([name]).then(m=>m[name]||'');
window.GD_faces=batch;
window.GD_FACE_FIX=FIX;
window.GD_faces_reset=()=>{cache={};save()};
})();
