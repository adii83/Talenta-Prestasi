/* winner-manager.js â€” CRUD kategori juara & pemenang lomba aktif */
const WM_KEY='talenta_winner_manager_v1',WM_DISPLAY_KEY='talenta_winner_page_v1';
let wmState=load();
let wmDisplay=loadDisplay();

function load(){const comp=getActiveCompetition();if(!comp)return{competitionId:'',categories:[],sk:{title:'',description:'',url:''}};const saved=JSON.parse(localStorage.getItem(WM_KEY)||'null');if(saved&&saved.competitionId===comp.id)return saved;return{competitionId:comp.id,categories:(comp.winnerCategories||[]).map(c=>({id:c.id,name:c.name,icon:c.icon,rankPrefix:'Juara',active:true,winners:c.winners.map(w=>({...w}))})),sk:comp.skDocument?{title:comp.skDocument.title,description:comp.skDocument.description,url:comp.skDocument.url}:{title:'SK Penetapan Pemenang',description:'',url:''}}}
function loadDisplay(){const comp=getActiveCompetition(),saved=JSON.parse(localStorage.getItem(WM_DISPLAY_KEY)||'null');return{active:true,eyebrow:comp?.name||'',title:'Daftar Pemenang',description:'Selamat kepada para pemenang ajang talenta nasional tahun ini.',alignment:'left',showSk:true,showPhoto:true,showSchool:true,showExam:true,showDistrict:true,showRegency:true,showProvince:true,archiveActive:true,archiveTitle:'Pemenang Ajang Talenta Sebelumnya',archiveAction:'Lihat Pemenang',archiveLimit:3,...(saved||{})}}
function saveDisplay(){localStorage.setItem(WM_DISPLAY_KEY,JSON.stringify(wmDisplay))}
function save(){localStorage.setItem(WM_KEY,JSON.stringify(wmState));saveDisplay();toast('Data pemenang berhasil disimpan.')}
function uid(){return'wc-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function wid(){return'wn-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function esc(v=''){return String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function toast(msg,err=false){const t=document.getElementById('adminToast');t.querySelector('span').textContent=msg;t.classList.toggle('admin-toast--error',err);t.classList.add('admin-toast--show');setTimeout(()=>t.classList.remove('admin-toast--show'),2600)}
function icons(){lucide.createIcons()}

document.addEventListener('DOMContentLoaded',()=>{renderActiveComp();syncSk();bindSk();renderCategories();syncDisplay();bindDisplay();renderArchiveSources();renderPreview();bindGlobal();icons()});

function renderActiveComp(){const comp=getActiveCompetition(),el=document.getElementById('wmActiveCompetition');if(!comp){el.innerHTML='<p class="wm-empty">Tidak ada lomba aktif. Tambahkan lomba dengan status "active" di database.</p>';return}el.innerHTML=`<div class="wm-comp-badge"><i data-lucide="${esc(comp.icon||'trophy')}"></i><div><strong>${esc(comp.name)}</strong><small>${esc(comp.shortName)} Â· ${(comp.winnerCategories||[]).length} kategori sumber Â· ${getAllWinners(comp).length} pemenang sumber</small></div></div>`}
function syncSk(){document.getElementById('wmSkTitle').value=wmState.sk.title;document.getElementById('wmSkDescription').value=wmState.sk.description;document.getElementById('wmSkUrl').value=wmState.sk.url}
function bindSk(){['wmSkTitle','wmSkDescription','wmSkUrl'].forEach(id=>{const key=id.replace('wmSk','').toLowerCase().replace('title','title').replace('description','description').replace('url','url');const map={wmSkTitle:'title',wmSkDescription:'description',wmSkUrl:'url'};document.getElementById(id).oninput=e=>{wmState.sk[map[id]]=e.target.value;renderPreview()}})}
function syncDisplay(){const vals={wmPageActive:wmDisplay.active,wmPageEyebrow:wmDisplay.eyebrow,wmPageTitle:wmDisplay.title,wmPageDescription:wmDisplay.description,wmPageAlignment:wmDisplay.alignment,wmShowSk:wmDisplay.showSk,wmShowPhoto:wmDisplay.showPhoto,wmShowSchool:wmDisplay.showSchool,wmShowExam:wmDisplay.showExam,wmShowDistrict:wmDisplay.showDistrict,wmShowRegency:wmDisplay.showRegency,wmShowProvince:wmDisplay.showProvince,wmArchiveActive:wmDisplay.archiveActive,wmArchiveTitle:wmDisplay.archiveTitle,wmArchiveAction:wmDisplay.archiveAction,wmArchiveLimit:wmDisplay.archiveLimit};Object.entries(vals).forEach(([id,v])=>{const e=document.getElementById(id);e.type==='checkbox'?e.checked=v:e.value=v})}
function bindDisplay(){const text={wmPageEyebrow:'eyebrow',wmPageTitle:'title',wmPageDescription:'description',wmArchiveTitle:'archiveTitle',wmArchiveAction:'archiveAction'};Object.entries(text).forEach(([id,k])=>document.getElementById(id).oninput=e=>{wmDisplay[k]=e.target.value;renderPreview()});document.getElementById('wmPageAlignment').onchange=e=>{wmDisplay.alignment=e.target.value;renderPreview()};const checks={wmPageActive:'active',wmShowSk:'showSk',wmShowPhoto:'showPhoto',wmShowSchool:'showSchool',wmShowExam:'showExam',wmShowDistrict:'showDistrict',wmShowRegency:'showRegency',wmShowProvince:'showProvince',wmArchiveActive:'archiveActive'};Object.entries(checks).forEach(([id,k])=>document.getElementById(id).onchange=e=>{wmDisplay[k]=e.target.checked;renderPreview()});document.getElementById('wmArchiveLimit').oninput=e=>{wmDisplay.archiveLimit=Math.max(1,Math.min(12,Number(e.target.value)||1));renderArchiveSources();renderPreview()}}
function renderArchiveSources(){const root=document.getElementById('wmArchiveSourceList'),items=getArchivedCompetitions();root.innerHTML=`<p class="wm-source-note"><i data-lucide="database"></i> ${items.length} lomba Arsip tersedia; ${Math.min(wmDisplay.archiveLimit,items.length)} card akan tampil.</p>`+items.map((c,i)=>`<div class="wm-archive-source ${i<wmDisplay.archiveLimit?'is-included':''}"><i data-lucide="${esc(c.icon||'archive')}"></i><span><strong>${esc(c.name)}</strong><small>${(c.winnerCategories||[]).reduce((n,x)=>n+x.winners.filter(w=>w.active).length,0)} pemenang · Sumber Arsip</small></span><em>${i<wmDisplay.archiveLimit?'Ditampilkan':'Di luar batas'}</em></div>`).join('');icons()}
function bindGlobal(){document.getElementById('sidebarToggle').onclick=()=>document.getElementById('adminSidebar').classList.toggle('admin-sidebar--open');document.getElementById('winnerManagerForm').onsubmit=e=>{e.preventDefault();save()};document.getElementById('resetWinnerManager').onclick=()=>{if(confirm('Reset data pemenang?')){localStorage.removeItem(WM_KEY);localStorage.removeItem(WM_DISPLAY_KEY);location.reload()}};document.getElementById('addWinnerCategory').onclick=()=>{wmState.categories.push({id:uid(),name:'Kategori Baru',icon:'medal',rankPrefix:'Juara',active:true,winners:[]});renderCategories();renderPreview()};document.querySelectorAll('[data-wm-preview]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-wm-preview]').forEach(x=>x.classList.remove('preview-switch__btn--active'));b.classList.add('preview-switch__btn--active');const f=document.getElementById('wmPreviewFrame');f.classList.remove('wm-preview-frame--tablet','wm-preview-frame--mobile');if(b.dataset.wmPreview!=='desktop')f.classList.add('wm-preview-frame--'+b.dataset.wmPreview)})}

function renderCategories(){const root=document.getElementById('wmCategoryEditor');root.innerHTML='';wmState.categories.forEach((cat,ci)=>{const el=document.createElement('div');el.className='wm-category-block';el.innerHTML=`
<div class="wm-category-header">
<div class="wm-category-header__order"><button type="button" data-cat-up ${ci===0?'disabled':''}><i data-lucide="chevron-up"></i></button><span>${String(ci+1).padStart(2,'0')}</span><button type="button" data-cat-down ${ci===wmState.categories.length-1?'disabled':''}><i data-lucide="chevron-down"></i></button></div>
<div class="wm-category-header__fields">
<div class="admin-field"><label>Nama kategori</label><input class="form-input" data-cat-name value="${esc(cat.name)}"></div>
<div class="admin-field"><label>Ikon <small>(Lucide)</small></label><input class="form-input" data-cat-icon value="${esc(cat.icon)}"></div>
<div class="admin-field"><label>Prefix rank <small>(mis. "Juara", "Medali")</small></label><input class="form-input" data-cat-prefix value="${esc(cat.rankPrefix||'Juara')}"></div>
</div>
<label class="admin-switch"><input type="checkbox" data-cat-toggle ${cat.active?'checked':''}><span></span><em>${cat.active?'Aktif':'Nonaktif'}</em></label>
<button type="button" class="repeat-row__delete" data-cat-delete title="Hapus kategori"><i data-lucide="trash-2"></i></button>
</div>
<div class="wm-winners-section">
<div class="wm-winners-toolbar"><strong><i data-lucide="${esc(cat.icon)}"></i> ${esc(cat.name)} <span class="badge badge--gold">${cat.winners.length} Pemenang</span></strong><button type="button" class="btn btn--outline btn--sm" data-add-winner><i data-lucide="user-plus"></i> Tambah pemenang</button></div>
<div class="wm-winners-list" data-winners></div>
</div>`;
// Bind category fields
el.querySelector('[data-cat-name]').oninput=e=>{cat.name=e.target.value;renderCategories();renderPreview()};
el.querySelector('[data-cat-icon]').oninput=e=>{cat.icon=e.target.value;renderPreview()};
el.querySelector('[data-cat-prefix]').oninput=e=>{cat.rankPrefix=e.target.value;renderPreview()};
el.querySelector('[data-cat-toggle]').onchange=e=>{cat.active=e.target.checked;renderCategories();renderPreview()};
el.querySelector('[data-cat-up]').onclick=()=>{if(ci>0){[wmState.categories[ci-1],wmState.categories[ci]]=[wmState.categories[ci],wmState.categories[ci-1]];renderCategories();renderPreview()}};
el.querySelector('[data-cat-down]').onclick=()=>{if(ci<wmState.categories.length-1){[wmState.categories[ci],wmState.categories[ci+1]]=[wmState.categories[ci+1],wmState.categories[ci]];renderCategories();renderPreview()}};
el.querySelector('[data-cat-delete]').onclick=()=>{if(confirm(`Hapus kategori "${cat.name}" dan semua pemenangnya?`)){wmState.categories.splice(ci,1);renderCategories();renderPreview()}};
el.querySelector('[data-add-winner]').onclick=()=>{cat.winners.push({id:wid(),rank:`${cat.rankPrefix||'Juara'} ${cat.winners.length+1}`,name:'',school:'',exam:'',district:'',regency:'',province:'',photo:'',active:true});renderCategories();renderPreview()};
// Render winners
const wList=el.querySelector('[data-winners]');cat.winners.forEach((w,wi)=>{const wEl=document.createElement('div');wEl.className='wm-winner-card'+(w.active?'':' wm-winner-card--disabled');wEl.innerHTML=`
<div class="wm-winner-card__header">
<div class="wm-winner-card__photo">${w.photo?`<img src="${esc(w.photo)}" alt="${esc(w.name)}">`:initials(w.name)}</div>
<div class="wm-winner-card__order"><button type="button" data-w-up ${wi===0?'disabled':''}><i data-lucide="chevron-up"></i></button><span>${wi+1}</span><button type="button" data-w-down ${wi===cat.winners.length-1?'disabled':''}><i data-lucide="chevron-down"></i></button></div>
<label class="admin-switch"><input type="checkbox" data-w-toggle ${w.active?'checked':''}><span></span><em>${w.active?'Aktif':'Nonaktif'}</em></label>
<button type="button" class="repeat-row__delete" data-w-delete><i data-lucide="trash-2"></i></button>
</div>
<div class="wm-winner-card__form admin-form-grid">
<div class="admin-field"><label>Label rank <small>(editable)</small></label><input class="form-input" data-w="rank" value="${esc(w.rank)}"></div>
<div class="admin-field"><label>Nama lengkap</label><input class="form-input" data-w="name" value="${esc(w.name)}" required></div>
<div class="admin-field"><label>Sekolah</label><input class="form-input" data-w="school" value="${esc(w.school)}"></div>
<div class="admin-field"><label>No. Ujian</label><input class="form-input" data-w="exam" value="${esc(w.exam)}"></div>
<div class="admin-field"><label>Kecamatan</label><input class="form-input" data-w="district" value="${esc(w.district)}"></div>
<div class="admin-field"><label>Kabupaten</label><input class="form-input" data-w="regency" value="${esc(w.regency)}"></div>
<div class="admin-field"><label>Provinsi</label><input class="form-input" data-w="province" value="${esc(w.province)}"></div>
<div class="admin-field"><label>Foto</label><input type="file" class="form-input" data-w-photo accept="image/png,image/jpeg,image/webp"></div>
</div>`;
wEl.querySelectorAll('[data-w]').forEach(inp=>inp.oninput=()=>{w[inp.dataset.w]=inp.value;if(inp.dataset.w==='name'){const photo=wEl.querySelector('.wm-winner-card__photo');if(!w.photo)photo.textContent=initials(w.name)}renderPreview()});
wEl.querySelector('[data-w-toggle]').onchange=e=>{w.active=e.target.checked;renderCategories();renderPreview()};
wEl.querySelector('[data-w-up]').onclick=()=>{if(wi>0){[cat.winners[wi-1],cat.winners[wi]]=[cat.winners[wi],cat.winners[wi-1]];renderCategories();renderPreview()}};
wEl.querySelector('[data-w-down]').onclick=()=>{if(wi<cat.winners.length-1){[cat.winners[wi],cat.winners[wi+1]]=[cat.winners[wi+1],cat.winners[wi]];renderCategories();renderPreview()}};
wEl.querySelector('[data-w-delete]').onclick=()=>{if(confirm(`Hapus pemenang "${w.name||'tanpa nama'}"?`)){cat.winners.splice(wi,1);renderCategories();renderPreview()}};
wEl.querySelector('[data-w-photo]').onchange=e=>{const file=e.target.files[0];if(!file)return;if(file.size>2*1024*1024){toast('Maksimal 2 MB.',true);return}const reader=new FileReader();reader.onload=()=>{w.photo=reader.result;renderCategories();renderPreview()};reader.readAsDataURL(file)};
wList.appendChild(wEl)});
root.appendChild(el)});icons()}

function initials(name){if(!name)return'?';return name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()}

function archiveCards(){if(!wmDisplay.archiveActive)return'';const items=getArchivedCompetitions().slice(0,wmDisplay.archiveLimit);if(!items.length)return'';return`<div class="archive-winners wm-preview__archives"><h3 class="archive-winners__title">${esc(wmDisplay.archiveTitle)}</h3><div class="grid grid--3">${items.map(c=>`<a href="#" class="lomba-card"><div class="lomba-card__thumb"><i data-lucide="${esc(c.icon||'archive')}"></i></div><div class="lomba-card__body"><h3 class="lomba-card__title">${esc(c.name)}</h3><p class="lomba-card__desc">${esc(c.description||'Lihat daftar pemenang ajang talenta sebelumnya.')}</p><span class="lomba-card__action">${esc(wmDisplay.archiveAction)} <i data-lucide="arrow-right"></i></span></div></a>`).join('')}</div></div>`}
function renderPreview(){const root=document.getElementById('wmPreview'),comp=getActiveCompetition();if(!comp){root.innerHTML='<div class="wm-empty">Tidak ada lomba aktif.</div>';return}if(!wmDisplay.active){root.innerHTML='<div class="preview-disabled"><i data-lucide="eye-off"></i><strong>Halaman Pemenang dinonaktifkan</strong><span>Aktifkan kembali dari Pengaturan Tampilan.</span></div>';icons();return}
const activeCats=wmState.categories.filter(c=>c.active&&c.winners.some(w=>w.active)),align=wmDisplay.alignment==='center'?'':' section__header--left';
root.innerHTML=`
<div class="section__header${align} wm-preview__public-header"><p class="t-eyebrow">${esc(wmDisplay.eyebrow)}</p><h1 class="t-h1">${esc(wmDisplay.title)}</h1><p>${esc(wmDisplay.description)}</p></div>
${wmDisplay.showSk&&wmState.sk.title?`<div class="sk-banner"><div class="sk-banner__left"><div class="sk-banner__icon"><i data-lucide="file-check-2"></i></div><div class="sk-banner__content"><h3>${esc(wmState.sk.title)}</h3><p>${esc(wmState.sk.description)}</p></div></div><button type="button" class="btn btn--primary wm-preview__download"><i data-lucide="download"></i> Unduh PDF</button></div>`:''}
<div class="winner-section">${activeCats.map(cat=>{const winners=cat.winners.filter(w=>w.active);return`<div class="winner-group"><h3 class="winner-group__title"><i data-lucide="${esc(cat.icon)}"></i>${esc(cat.name)}<span class="badge badge--gold">${winners.length} Pemenang</span></h3><div class="champion-grid">${winners.map(w=>`<article class="champion-card">${wmDisplay.showPhoto?`<div class="champion-card__photo">${w.photo?`<img src="${esc(w.photo)}" alt="Foto ${esc(w.name)}">`:`${initials(w.name)}`}</div>`:''}<p class="champion-card__rank t-mono">${esc(w.rank)}</p><p class="champion-card__name">${esc(w.name||'—')}</p>${wmDisplay.showSchool?`<p class="champion-card__school">${esc(w.school)}</p>`:''}<div class="champion-card__meta">${wmDisplay.showExam?`<span><span class="meta-label">No. Ujian:</span> ${esc(w.exam)}</span>`:''}${wmDisplay.showDistrict?`<span><span class="meta-label">Kecamatan:</span> ${esc(w.district)}</span>`:''}${wmDisplay.showRegency?`<span><span class="meta-label">Kabupaten:</span> ${esc(w.regency)}</span>`:''}${wmDisplay.showProvince?`<span><span class="meta-label">Provinsi:</span> ${esc(w.province)}</span>`:''}</div></article>`).join('')}</div></div>`}).join('')}</div>
${!activeCats.length?'<div class="wm-empty"><i data-lucide="trophy"></i><strong>Belum ada pemenang</strong><span>Tambahkan kategori dan data pemenang dari editor di atas.</span></div>':''}${archiveCards()}`;icons()}

