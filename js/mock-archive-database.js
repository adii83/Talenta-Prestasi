/* Database dummy bersama — sumber tunggal lomba, dokumen, kategori juara, dan pemenang.
   Nantinya diganti API/database. Jangan mengubah field yang sudah dipakai editor Unduh. */

function doc(id,title,category,size){return{id,title,category,type:'PDF',size,url:'#',active:true}}
function winner(id,rank,name,school,exam,district,regency,province,photo){return{id,rank,name,school,exam,district,regency,province,photo:photo||'',active:true}}

const MOCK_ARCHIVE_DATABASE={competitions:[

/* === LOMBA AKTIF (sekarang) === */
{id:'osn-2026',name:'Olimpiade Sains Nusantara 2026',shortName:'OSN 2026',status:'active',icon:'graduation-cap',
description:'Ajang talenta akademik bergengsi untuk siswa SD, SMP, dan SMA se-Indonesia.',
skDocument:{title:'SK Penetapan Pemenang',description:'Unduh dokumen resmi SK Pemenang untuk keperluan administrasi sekolah.',url:'#',type:'PDF',size:'1.5 MB'},
winnerCategories:[
{id:'juara-umum',name:'Juara Umum',icon:'trophy',winners:[
winner('osn26-w1','Peringkat 1','Anisa Rahmawati','SDN 1 Coblong','2026-0001','Coblong','Kota Bandung','Jawa Barat'),
winner('osn26-w2','Peringkat 2','Bimo Prasetyo','SMPN 2 Gubeng','2026-0042','Gubeng','Kota Surabaya','Jawa Timur'),
winner('osn26-w3','Peringkat 3','Citra Wulandari','SMAN 3 Menteng','2026-0108','Menteng','Jakarta Pusat','DKI Jakarta')]},
{id:'juara-harapan',name:'Juara Harapan',icon:'award',winners:[
winner('osn26-w4','Harapan 1','Dian Kusuma','SDN 4 Gondokusuman','2026-0215','Gondokusuman','Kota Yogyakarta','DI Yogyakarta'),
winner('osn26-w5','Harapan 2','Eko Firmansyah','SMPN 5 Semarang','2026-0330','Semarang Selatan','Kota Semarang','Jawa Tengah'),
winner('osn26-w6','Harapan 3','Farah Nugraha','SMAN 6 Sukmajaya','2026-0412','Sukmajaya','Kota Depok','Jawa Barat')]}
],
documents:[
doc('osn26-juknis','Petunjuk Teknis Olimpiade Sains Nusantara 2026','Juknis','2.4 MB'),
doc('osn26-kisi-sd','Kisi-kisi Matematika SD/MI','Kisi-kisi','1.1 MB'),
doc('osn26-kisi-smp','Kisi-kisi IPA SMP/MTs','Kisi-kisi','980 KB'),
doc('osn26-surat','Surat Edaran Perpanjangan Pendaftaran','Pengumuman','340 KB'),
doc('osn26-bank','Bank Soal Latihan IPA SMA/MA','Materi','4.7 MB')]},

/* === LOMBA ARSIP === */
{id:'osn-2025',name:'Olimpiade Sains Nusantara 2025',shortName:'OSN 2025',status:'published',icon:'graduation-cap',
description:'Ajang talenta nasional bidang Matematika dan IPA untuk jenjang SD, SMP, dan SMA se-Indonesia. Diikuti oleh lebih dari 8.000 peserta.',
skDocument:{title:'SK Penetapan Pemenang OSN 2025',description:'Unduh dokumen resmi SK Pemenang.',url:'#',type:'PDF',size:'1.2 MB'},
winnerCategories:[
{id:'juara-umum',name:'Juara Umum',icon:'trophy',winners:[
winner('osn25-w1','Peringkat 1','Anisa Rahmawati','SDN 1 Coblong','2025-0001','Coblong','Kota Bandung','Jawa Barat'),
winner('osn25-w2','Peringkat 2','Bimo Prasetyo','SMPN 2 Gubeng','2025-0042','Gubeng','Kota Surabaya','Jawa Timur'),
winner('osn25-w3','Peringkat 3','Citra Wulandari','SMAN 3 Menteng','2025-0108','Menteng','Jakarta Pusat','DKI Jakarta')]},
{id:'juara-harapan',name:'Juara Harapan',icon:'award',winners:[
winner('osn25-w4','Harapan 1','Dian Kusuma','SDN 4 Gondokusuman','2025-0215','Gondokusuman','Kota Yogyakarta','DI Yogyakarta'),
winner('osn25-w5','Harapan 2','Eko Firmansyah','SMPN 5 Semarang','2025-0330','Semarang Selatan','Kota Semarang','Jawa Tengah'),
winner('osn25-w6','Harapan 3','Farah Nugraha','SMAN 6 Sukmajaya','2025-0412','Sukmajaya','Kota Depok','Jawa Barat')]}
],
documents:[doc('osn25-sk','SK Penetapan Pemenang OSN 2025','SK Pemenang','1.2 MB'),doc('osn25-kisi','Kisi-kisi Soal OSN 2025','Kisi-kisi','890 KB'),doc('osn25-materi','Soal & Pembahasan OSN 2025','Materi','3.6 MB')]},

{id:'osn-2024',name:'Olimpiade Sains Nusantara 2024',shortName:'OSN 2024',status:'published',icon:'beaker',
description:'Edisi kedua dengan penambahan bidang lomba Bahasa Inggris dan Informatika.',
skDocument:null,
winnerCategories:[
{id:'juara-umum',name:'Juara Umum',icon:'trophy',winners:[
winner('osn24-w1','Peringkat 1','Galih Permana','SMPN 1 Malang','2024-0010','Klojen','Kota Malang','Jawa Timur'),
winner('osn24-w2','Peringkat 2','Hana Safitri','SDN 5 Denpasar','2024-0025','Denpasar Selatan','Kota Denpasar','Bali')]}
],
documents:[doc('osn24-juknis','Petunjuk Teknis OSN 2024','Juknis','2.1 MB'),doc('osn24-materi','Soal & Pembahasan OSN 2024','Materi','3.2 MB')]},

{id:'osn-2023',name:'Olimpiade Sains Nusantara 2023',shortName:'OSN 2023',status:'published',icon:'atom',
description:'Edisi perdana diikuti oleh lebih dari 5.000 siswa dari 34 provinsi di Indonesia.',
skDocument:null,winnerCategories:[],
documents:[doc('osn23-juknis','Petunjuk Teknis OSN 2023','Juknis','1.8 MB')]},

{id:'matematika-2023',name:'Ajang Talenta Matematika Nasional 2023',shortName:'Matematika 2023',status:'published',icon:'calculator',
description:'Ajang talenta khusus bidang Matematika dengan tingkat kesulitan bertingkat untuk semua jenjang.',
skDocument:{title:'SK Pemenang Matematika Nasional 2023',description:'Unduh SK resmi.',url:'#',type:'PDF',size:'1.0 MB'},
winnerCategories:[
{id:'juara-umum',name:'Juara Umum',icon:'trophy',winners:[
winner('mat23-w1','Peringkat 1','Irfan Maulana','SMAN 1 Bogor','2023-0005','Bogor Tengah','Kota Bogor','Jawa Barat'),
winner('mat23-w2','Peringkat 2','Jihan Putri','SMPN 3 Makassar','2023-0018','Panakkukang','Kota Makassar','Sulawesi Selatan')]}
],
documents:[doc('mat23-sk','SK Pemenang Matematika Nasional 2023','SK Pemenang','1.0 MB'),doc('mat23-soal','Soal & Pembahasan Matematika Nasional 2023','Materi','2.8 MB')]}

]};

/* Helper functions untuk konsumen data */
function getActiveCompetition(){return MOCK_ARCHIVE_DATABASE.competitions.find(c=>c.status==='active')}
function getArchivedCompetitions(){return MOCK_ARCHIVE_DATABASE.competitions.filter(c=>c.status==='published')}
function getCompetitionById(id){return MOCK_ARCHIVE_DATABASE.competitions.find(c=>c.id===id)}
function getAllWinners(competition){return(competition.winnerCategories||[]).flatMap(cat=>cat.winners.filter(w=>w.active).map(w=>({...w,categoryName:cat.name,categoryIcon:cat.icon})))}
