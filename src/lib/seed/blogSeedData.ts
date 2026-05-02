// ============================================================================
// Long-form seed articles for the public News surface (PPMH Insight).
// Used by the client-side seeder at /dev/seed-blog.
// ============================================================================

export interface SeedPost {
  title: string;
  slug: string;
  excerpt: string;
  content: string; // HTML
  category: string;
  tags: string[];
  featured_image: string;
  meta_title?: string;
  meta_description?: string;
  daysAgo: number; // for published_at offset
}

const lorem = (paragraphs: string[]) =>
  paragraphs.map((p) => `<p>${p}</p>`).join("\n");

export const SEED_POSTS: SeedPost[] = [
  {
    title: "Menumbuhkan Jiwa Kepemimpinan Santri di Era Digital",
    slug: "jiwa-kepemimpinan-santri-era-digital",
    excerpt:
      "Bagaimana PPMH membentuk pemimpin masa depan yang berakhlak, melek teknologi, dan siap menghadapi disrupsi global.",
    category: "Edukasi",
    tags: ["kepemimpinan", "santri", "digital", "karakter"],
    featured_image:
      "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=1600",
    daysAgo: 0,
    meta_title: "Kepemimpinan Santri di Era Digital — PPMH Insight",
    meta_description:
      "Pondok Pesantren Miftahul Huda membekali santri dengan kepemimpinan, literasi digital, dan akhlak mulia.",
    content: lorem([
      "Di tengah arus deras transformasi digital, peran pesantren tidak lagi sekadar menjaga warisan klasik keilmuan Islam, tetapi juga menyiapkan kader pemimpin yang relevan dengan zaman. Pondok Pesantren Miftahul Huda (PPMH) memandang dua hal ini bukan sebagai pertentangan, melainkan sebagai pilar yang harus berjalan bergandengan.",
      "Sejak tiga tahun terakhir, PPMH menggulirkan program <em>Madrasah Kepemimpinan Santri</em>, sebuah kurikulum tambahan yang mengasah kemampuan komunikasi publik, manajemen organisasi, hingga literasi data. Para santri dilatih memimpin rapat, menyusun proposal kegiatan, dan mengevaluasi program berbasis indikator yang terukur.",
      "“Kami ingin santri tidak hanya pandai memahami kitab, tetapi juga pandai memimpin masyarakatnya kelak,” ujar Ustadz Hilman, koordinator program. Menurutnya, kepemimpinan adalah amanah yang menuntut keterpaduan ilmu, akhlak, dan keterampilan praktis.",
      "Modul digital menjadi bagian wajib. Santri belajar dasar-dasar keamanan siber, etika bermedia sosial, hingga produksi konten dakwah berbasis video pendek. Studio mini di kompleks pesantren beroperasi setiap pekan, menghasilkan ratusan konten yang ditonton ribuan jamaah daring.",
      "Hasilnya mulai terlihat. Beberapa alumni terpilih sebagai delegasi Indonesia pada forum pemuda lintas agama tingkat ASEAN, sementara yang lain merintis startup sosial yang fokus pada literasi keuangan syariah di pedesaan. Dampaknya kembali kepada pesantren dalam bentuk jejaring alumni yang aktif memberi dukungan beasiswa.",
      "Tantangan tentu tidak ringan. Distraksi digital, polarisasi opini, dan derasnya hoaks menuntut santri memiliki <strong>filter ilmu</strong> yang kuat. Karena itu, kajian ushul fikih, manthiq, dan tafsir kontemporer menjadi fondasi sebelum mereka diterjunkan ke ruang publik digital.",
      "PPMH percaya, kepemimpinan sejati tumbuh dari kepekaan terhadap penderitaan umat. Setiap santri pemimpin diwajibkan menjalani program <em>khidmah masyarakat</em> selama satu bulan penuh: mengajar TPA, mendampingi UMKM, atau menjadi relawan bencana. Pengalaman lapangan ini menjadi kawah candradimuka pembentukan karakter.",
      "Ke depan, pesantren menargetkan pembukaan inkubator kepemimpinan lintas pesantren se-Jawa Barat. Harapannya, lahir generasi pemimpin yang membumi, melek teknologi, dan tetap berpegang teguh pada nilai-nilai Ahlussunnah wal Jamaah.",
    ]),
  },
  {
    title:
      "Prestasi Gemilang: PPMH Juara Umum Lomba Menulis Esai Tingkat Nasional",
    slug: "prestasi-juara-umum-esai-nasional",
    excerpt:
      "Tim literasi PPMH menyabet enam medali sekaligus, mengukuhkan posisi pesantren sebagai pusat literasi santri Indonesia.",
    category: "Prestasi",
    tags: ["prestasi", "literasi", "esai", "nasional"],
    featured_image:
      "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=1600",
    daysAgo: 2,
    content: lorem([
      "Kabar membanggakan datang dari ajang Lomba Menulis Esai Tingkat Nasional 2026 yang digelar Kementerian Agama. Tim literasi Pondok Pesantren Miftahul Huda (PPMH) berhasil menyabet predikat Juara Umum dengan enam medali: dua emas, tiga perak, dan satu perunggu.",
      "Tema yang diangkat tahun ini adalah <em>“Santri, Sains, dan Kebangsaan”</em>. Para peserta dituntut menyusun argumen yang menggabungkan perspektif keislaman dengan isu-isu kontemporer seperti perubahan iklim, kecerdasan buatan, dan ketahanan pangan.",
      "Dewi Anjani, santriwati kelas akhir, menulis esai berjudul <strong>“Fikih Air dan Krisis Iklim”</strong> yang menjadi salah satu pemenang emas. Esainya membongkar relevansi kaidah-kaidah fikih klasik dengan tantangan kelangkaan air bersih di abad ke-21.",
      "“Saya banyak membaca kitab-kitab klasik di perpustakaan pesantren, lalu menghubungkannya dengan laporan IPCC. Ternyata Islam sudah lama berbicara soal konservasi air,” tutur Dewi. Ia berharap esainya bisa menjadi pengingat bahwa khazanah Islam tetap relevan menjawab persoalan kekinian.",
      "Pembina literasi, Ustadzah Maryam, menjelaskan bahwa keberhasilan ini adalah buah dari ekosistem membaca yang dibangun bertahun-tahun. Setiap santri diwajibkan menyelesaikan minimal 24 buku per tahun, dengan bimbingan kakak asuh literasi.",
      "Selain medali individu, PPMH juga menerima penghargaan <em>Pesantren Literasi Terbaik</em>. Penghargaan ini diberikan atas konsistensi pesantren dalam menerbitkan buletin bulanan, jurnal santri, dan podcast kajian yang dijalankan sepenuhnya oleh para santri.",
      "Pimpinan pondok, KH. Abdul Hadi, menyampaikan rasa syukur dan menekankan pentingnya menjaga kerendahan hati. “Prestasi ini bukan tujuan akhir, melainkan amanah untuk terus berkhidmah lewat tulisan,” pesannya saat menyambut tim di gerbang pondok.",
      "Sebagai apresiasi, pesantren akan memberangkatkan tiga santri terbaik mengikuti residensi penulisan di Yogyakarta selama dua pekan. Mereka akan dibimbing langsung oleh penulis senior nasional dan diharapkan menghasilkan karya buku antologi sebelum akhir tahun.",
    ]),
  },
  {
    title: "Kajian Mingguan: Menggali Makna Sabar dalam Kitab Al-Hikam",
    slug: "kajian-mingguan-makna-sabar-al-hikam",
    excerpt:
      "Catatan utuh kajian rutin Selasa malam yang membedah hikmah Ibnu Athaillah tentang kesabaran dan tawakal.",
    category: "Kajian",
    tags: ["kajian", "tasawuf", "al-hikam", "sabar"],
    featured_image:
      "https://images.unsplash.com/photo-1507676184212-d0330a151f84?auto=format&fit=crop&q=80&w=1600",
    daysAgo: 5,
    content: lorem([
      "Kajian rutin Selasa malam di aula utama PPMH kembali ramai oleh ratusan santri dan jamaah dari kampung sekitar. Kitab yang dikaji malam itu adalah <em>Al-Hikam</em> karya Syaikh Ibnu Athaillah As-Sakandari, dengan fokus pembahasan hikmah keempat tentang sabar.",
      "Pengasuh, KH. Abdul Hadi, mengawali pembahasan dengan mengutip teks Arab kemudian membaca terjemahan harfiahnya. Beliau menekankan bahwa sabar dalam tradisi tasawuf bukan sekadar menahan diri, tetapi “berdiam pada perintah dan larangan Allah meski berat dirasa nafsu”.",
      "“Sabar memiliki tiga wajah,” jelas beliau, “sabar dalam ketaatan, sabar menjauhi maksiat, dan sabar menerima takdir.” Ketiganya, menurut Ibnu Athaillah, menjadi pintu masuk menuju makam tawakal yang lebih tinggi.",
      "Diskusi semakin hidup ketika santri diberi kesempatan bertanya. Salah seorang santri bertanya bagaimana membedakan sabar yang aktif dengan sikap pasrah yang pasif. KH. Abdul Hadi menjawab bahwa sabar sejati selalu disertai ikhtiar maksimal; ia adalah ketenangan hati di tengah perjuangan, bukan kemalasan yang dibungkus jubah agama.",
      "Pembahasan kemudian melebar ke konteks kontemporer: bagaimana sabar diuji oleh notifikasi yang tak henti, ujaran kebencian di media sosial, hingga tekanan akademik. Beliau menyitir nasihat Imam Al-Ghazali bahwa setiap zaman memiliki <em>mujahadah</em>-nya sendiri.",
      "Sebagai latihan praktis, santri diberi <strong>amalan harian</strong>: menahan diri dari membuka ponsel sebelum subuh, menulis tiga hal yang disyukuri sebelum tidur, dan membaca minimal lima halaman kitab kuning setiap malam. Amalan ini dipantau melalui buku mutaba’ah yang ditandatangani musyrif.",
      "Kajian ditutup dengan doa bersama dan pembacaan ratib. Nuansa khusyuk membungkus aula yang remang oleh cahaya lampu kuning, menyisakan kesan mendalam tentang betapa sabar adalah jalan panjang yang menuntut kesetiaan harian.",
      "Bagi yang berhalangan hadir, rekaman kajian dapat diakses melalui kanal YouTube resmi pesantren. Tim media santri juga menerbitkan ringkasan satu halaman yang dibagikan setiap Rabu pagi melalui mading dan grup WhatsApp jamaah.",
    ]),
  },
  {
    title: "Lab Robotika Santri: Ketika Kitab Kuning Bertemu Mikrokontroler",
    slug: "lab-robotika-santri-kitab-mikrokontroler",
    excerpt:
      "PPMH meresmikan laboratorium robotika berstandar nasional, mengintegrasikan etika Islam dalam desain teknologi.",
    category: "Inovasi",
    tags: ["teknologi", "robotika", "inovasi", "santri"],
    featured_image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1600",
    daysAgo: 8,
    content: lorem([
      "PPMH resmi membuka <strong>Lab Robotika Santri</strong>, sebuah ruang seluas 120 meter persegi yang dilengkapi dengan 30 unit komputer, printer 3D, dan ratusan modul Arduino serta Raspberry Pi. Peresmian dihadiri perwakilan Kementerian Agama dan beberapa kampus mitra.",
      "Inisiatif ini muncul dari keprihatinan bahwa banyak santri lulus tanpa bekal teknis yang memadai untuk menghadapi industri 4.0. “Kami ingin santri tidak hanya jadi penonton, tapi juga pencipta teknologi,” ujar koordinator lab, Ustadz Faiz.",
      "Kurikulum lab dirancang berlapis: dasar elektronika, pemrograman C dan Python, hingga proyek mandiri membuat alat sederhana seperti otomatisasi lampu masjid berbasis sensor cahaya. Setiap proyek dievaluasi dengan dua kriteria: <em>fungsi teknis</em> dan <em>maslahat umat</em>.",
      "Yang menarik, lab ini juga menyelenggarakan kajian khusus bertajuk <em>Fikih Teknologi</em>. Santri diajak membahas isu privasi, tanggung jawab algoritma, dan etika kecerdasan buatan dari perspektif maqashid syariah. Kitab rujukannya cukup beragam, mulai dari karya klasik hingga riset kontemporer.",
      "Salah satu prototipe unggulan adalah <strong>“Tongkat Pintar Tunanetra”</strong> yang dikembangkan oleh tim santri kelas dua aliyah. Tongkat ini dilengkapi sensor ultrasonik dan modul GPS dengan biaya produksi di bawah Rp350 ribu per unit.",
      "Tim lain mengembangkan sistem irigasi cerdas untuk kebun pesantren. Sensor kelembapan tanah terhubung dengan pompa otomatis sehingga konsumsi air berkurang hingga 40 persen. Solusi ini telah diadopsi oleh kelompok tani di desa tetangga.",
      "Pesantren menjalin kemitraan dengan dua universitas teknik untuk program magang riset. Setiap semester, lima santri terbaik dikirim untuk belajar langsung di laboratorium kampus, sebelum kembali membagikan ilmunya kepada adik-adik tingkat.",
      "Ke depan, PPMH menargetkan partisipasi rutin pada kompetisi robotika nasional dan internasional. Namun, capaian utama yang diharapkan bukan sekadar piala, melainkan munculnya inovator muda berakhlak yang membangun teknologi untuk maslahat umat.",
    ]),
  },
  {
    title: "Festival Budaya Santri: Merayakan Warisan Nusantara",
    slug: "festival-budaya-santri-warisan-nusantara",
    excerpt:
      "Tiga hari penuh ekspresi seni santri: hadrah kontemporer, kaligrafi digital, hingga pasar UMKM alumni.",
    category: "Komunitas",
    tags: ["festival", "budaya", "alumni", "umkm"],
    featured_image:
      "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=1600",
    daysAgo: 12,
    content: lorem([
      "Selama tiga hari berturut-turut, kompleks PPMH disulap menjadi ruang ekspresi raksasa dalam Festival Budaya Santri 2026. Lebih dari tiga ribu pengunjung memadati area pondok, dari santri, wali murid, alumni, hingga warga sekitar.",
      "Festival dibuka dengan parade hadrah dari 15 perwakilan pondok cabang. Tabuhan rebana berpadu dengan aransemen modern, menghasilkan harmoni yang khas: tradisional namun segar di telinga generasi muda.",
      "Panggung utama menampilkan beragam pertunjukan: pembacaan puisi sufistik, teater kolosal kisah Walisongo, hingga kompetisi <em>fashion show busana muslim</em> bertema “Wastra Nusantara”. Setiap penampilan diapresiasi dengan tepuk tangan meriah.",
      "Di sisi lain pondok, terdapat 60 stand UMKM yang dikelola alumni. Mulai dari kopi single origin, kerajinan kulit, hingga aplikasi belajar Al-Qur'an berbasis AI. Festival sekaligus menjadi ajang reuni dan kolaborasi bisnis lintas angkatan.",
      "Kompetisi kaligrafi digital menjadi sorotan baru. Peserta tidak lagi hanya menggunakan kuas dan tinta, tetapi juga tablet grafis dan perangkat lunak desain. “Tradisi tidak boleh terhenti, ia harus berbicara dengan bahasa zamannya,” kata juri kompetisi.",
      "Kelas-kelas terbuka digelar paralel: workshop menulis kreatif, dasar fotografi jurnalistik, hingga manajemen keuangan rumah tangga. Semua kelas gratis dan menggunakan sistem pendaftaran daring yang dibangun santri tim IT pondok.",
      "Hari terakhir ditutup dengan doa bersama dan pelepasan ribuan lentera kertas ramah lingkungan. Pemandangan langit malam yang dihiasi cahaya kecil menjadi momen yang menyentuh, menggambarkan harapan tentang masa depan generasi santri.",
      "Panitia mengumumkan bahwa hasil donasi festival, sebesar lebih dari Rp220 juta, akan dialokasikan untuk beasiswa santri yatim dan pembangunan asrama putri yang sedang dalam tahap akhir.",
    ]),
  },
  {
    title: "Beasiswa Tahfidz: Membuka Pintu untuk Santri Daerah 3T",
    slug: "beasiswa-tahfidz-santri-daerah-3t",
    excerpt:
      "Program beasiswa penuh untuk 50 santri terpilih dari daerah tertinggal, terdepan, dan terluar Indonesia.",
    category: "Pengumuman",
    tags: ["beasiswa", "tahfidz", "3t", "pengumuman"],
    featured_image:
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=1600",
    daysAgo: 15,
    content: lorem([
      "Pondok Pesantren Miftahul Huda secara resmi membuka pendaftaran <strong>Beasiswa Tahfidz Nusantara</strong> tahun ajaran 2026/2027. Sebanyak 50 kursi disediakan khusus bagi calon santri dari daerah 3T (Tertinggal, Terdepan, Terluar).",
      "Program ini menanggung seluruh biaya pendidikan, asrama, makan tiga kali sehari, kitab, hingga tiket transportasi pulang-pergi sekali setahun. Tujuannya jelas: memutus mata rantai keterbatasan akses pendidikan keagamaan berkualitas.",
      "Persyaratan administratif meliputi usia 12–16 tahun, hafalan minimal 5 juz, surat rekomendasi tokoh agama setempat, dan bukti domisili dari kepala desa. Seleksi dilakukan dalam tiga tahap: berkas, tes hafalan daring, dan wawancara kepribadian.",
      "“Banyak anak hebat di pelosok yang potensinya belum tersentuh. Kami ingin menjemput mereka,” jelas ketua panitia, Ustadz Ramli. Beliau menekankan pentingnya pemerataan, agar pesantren tidak hanya menjadi privilege bagi yang tinggal di kota.",
      "Untuk memudahkan calon peserta dari daerah dengan koneksi internet terbatas, panitia bekerja sama dengan kantor pos dan kantor urusan agama setempat sebagai titik distribusi formulir dan tempat tes daring.",
      "Selain pembiayaan, peserta beasiswa akan mengikuti program pendampingan psikososial untuk membantu adaptasi terhadap lingkungan baru. Mentor diambil dari alumni yang berasal dari daerah serupa, sehingga proses adaptasi lebih lancar.",
      "Pendaftaran dibuka mulai 1 Mei hingga 30 Juni 2026. Pengumuman hasil seleksi akan disampaikan paling lambat 15 Juli 2026 melalui situs resmi pesantren dan kanal media sosial. Santri terpilih diharapkan dapat memulai pembelajaran pada Agustus 2026.",
      "Pesantren mengajak para donatur, alumni, dan masyarakat luas untuk turut menyukseskan program ini. Sumbangan dapat disalurkan melalui rekening resmi yayasan dan setiap donasi akan dilaporkan secara transparan setiap kuartal.",
    ]),
  },
  {
    title: "Kuliner Pesantren: Rahasia Dapur yang Memberi Makan 1.200 Santri",
    slug: "kuliner-pesantren-dapur-1200-santri",
    excerpt:
      "Menengok dapur pondok yang mengelola lebih dari empat ton bahan pangan setiap minggu dengan prinsip halal dan sustainable.",
    category: "Komunitas",
    tags: ["kuliner", "dapur", "manajemen"],
    featured_image:
      "https://images.unsplash.com/photo-1466637574441-749b8f19452f?auto=format&fit=crop&q=80&w=1600",
    daysAgo: 20,
    content: lorem([
      "Pukul tiga dini hari, lampu dapur PPMH sudah menyala. Sembilan ibu juru masak yang akrab disapa <em>“ummi dapur”</em> mulai mengupas bawang, mencuci sayur, dan menanak nasi dalam panci raksasa berkapasitas 80 liter.",
      "Setiap hari, dapur pondok memasak untuk lebih dari 1.200 santri dengan menu tiga waktu makan. Total bahan pangan yang diolah mencapai empat ton per minggu, dari beras, sayur, telur, hingga ayam dan ikan segar.",
      "Manajemen logistik menjadi kunci. Pesantren bekerja sama langsung dengan koperasi petani di tiga desa sekitar untuk memasok beras dan sayur. Selain memastikan kesegaran, kerja sama ini juga meningkatkan kesejahteraan petani lokal.",
      "Soal gizi, dapur PPMH berkonsultasi dengan ahli gizi dari universitas mitra. Menu disusun mingguan dengan target kecukupan kalori, protein, dan serat. Santri yang memiliki alergi atau kondisi khusus dilayani melalui menu khusus.",
      "Sisa makanan diolah menjadi <strong>kompos</strong> untuk kebun sayur pondok. Kebun ini menyumbang sekitar 15 persen kebutuhan sayur harian, sekaligus menjadi sarana pembelajaran agroekologi bagi santri yang tertarik.",
      "Setiap Jumat, menu spesial disiapkan: nasi kebuli, gulai kambing, atau soto khas daerah asal santri yang berulang tahun pekan itu. Tradisi ini membangun rasa kekeluargaan dan menghormati keragaman kuliner Nusantara.",
      "Tim dapur juga menerima magang santri putri dari kelas keterampilan rumah tangga. Mereka belajar manajemen porsi, sanitasi makanan, hingga pencatatan stok berbasis aplikasi sederhana yang dibangun santri IT.",
      "“Memberi makan ribuan orang setiap hari adalah ibadah panjang,” ujar Ummi Sholihah, koordinator dapur sejak 18 tahun lalu. Beliau berpesan agar setiap proses dilakukan dengan bismillah, niat baik, dan kebersihan yang dijaga.",
    ]),
  },
  {
    title: "Olimpiade Sains Madrasah: Lima Santri Lolos Tingkat Internasional",
    slug: "olimpiade-sains-madrasah-internasional",
    excerpt:
      "Setelah seleksi ketat lima tahap, lima santri PPMH mewakili Indonesia di Asia Madrasah Science Olympiad.",
    category: "Prestasi",
    tags: ["olimpiade", "sains", "internasional"],
    featured_image:
      "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=1600",
    daysAgo: 25,
    content: lorem([
      "Lima santri PPMH dipastikan lolos sebagai delegasi Indonesia pada <em>Asia Madrasah Science Olympiad</em> 2026 yang akan digelar di Kuala Lumpur. Mereka akan berlaga pada bidang Matematika, Fisika, Biologi, Kimia, dan Astronomi.",
      "Perjalanan menuju level internasional bukan jalan pintas. Para santri menjalani lima tahap seleksi: tingkat pondok, kabupaten, provinsi, nasional, hingga seleksi akhir oleh tim Kementerian Agama yang dilakukan dalam bentuk camp pelatihan selama dua minggu.",
      "Pembina sains PPMH menyiapkan kurikulum khusus berbasis <em>problem solving</em>. Selain teori, santri dilatih menyelesaikan soal-soal kompetisi terdahulu, melakukan eksperimen, dan presentasi ilmiah dalam bahasa Inggris.",
      "“Tantangan terbesar adalah menyeimbangkan persiapan olimpiade dengan kewajiban belajar kitab dan setoran hafalan,” ujar Ahmad, perwakilan bidang fisika. Solusi yang ditemukan adalah jadwal belajar terpadu, dengan jam kosong sore khusus untuk eksperimen.",
      "Pesantren memberikan dukungan penuh, mulai dari akses laboratorium 24 jam, langganan jurnal ilmiah, hingga mentor lulusan PTN ternama yang berkenan membimbing secara daring tiga kali seminggu.",
      "Selain prestasi akademik, para santri juga akan menampilkan budaya Nusantara di sela kompetisi. Mereka berlatih hadrah dan tarian Saman selama beberapa minggu agar dapat memperkenalkan kekayaan budaya Indonesia kepada delegasi negara lain.",
      "Pesan dari pengasuh untuk para delegasi sederhana namun mendalam: “Bawalah ilmu dan akhlak. Menang atau tidak, jaga adab. Sebab nama baik pesantren dan agama lebih utama daripada medali.”",
      "Doa dan dukungan terus mengalir dari santri lain, alumni, dan jamaah. Sebuah <em>tahlil khusus</em> akan digelar pada malam keberangkatan, sebagai ungkapan tawakal sekaligus permohonan kemudahan dalam berkompetisi.",
    ]),
  },
  {
    title: "Membaca Ulang Pemikiran Imam Al-Ghazali untuk Generasi Z",
    slug: "membaca-ulang-pemikiran-al-ghazali",
    excerpt:
      "Esai panjang dari santri pasca-tahfidz tentang relevansi Ihya Ulumuddin di tengah krisis perhatian generasi digital.",
    category: "Opini",
    tags: ["opini", "al-ghazali", "tasawuf", "gen-z"],
    featured_image:
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&q=80&w=1600",
    daysAgo: 30,
    content: lorem([
      "Generasi Z hidup di tengah ledakan informasi yang belum pernah dialami umat manusia sebelumnya. Setiap detik, miliaran konten diproduksi dan disajikan tanpa henti. Dalam situasi inilah, pemikiran Imam Al-Ghazali tentang <em>tazkiyatun nafs</em> kembali menemukan relevansinya.",
      "Dalam <strong>Ihya Ulumuddin</strong>, Al-Ghazali menempatkan ilmu sebagai cahaya hati yang membutuhkan wadah jernih. Hati yang dipenuhi distraksi adalah cermin berdebu; betapapun banyak ilmu yang singgah, ia tidak akan memantul utuh.",
      "Generasi muda kita mengalami apa yang disebut <em>continuous partial attention</em>: perhatian terbelah pada banyak hal sekaligus, namun tidak benar-benar hadir pada satu pun. Ini adalah krisis spiritual yang sesungguhnya, bukan sekadar masalah produktivitas.",
      "Resep Al-Ghazali sederhana namun radikal untuk zaman ini: <em>khalwat</em>, <em>dzikir</em>, dan <em>muhasabah</em>. Menyendiri sebentar setiap hari, mengingat Allah dengan sadar, dan mengevaluasi diri sebelum tidur. Tiga praktik yang bertentangan langsung dengan logika algoritma media sosial.",
      "Tentu, kita tidak bisa secara naif menyuruh generasi muda meninggalkan ponsel sepenuhnya. Yang lebih realistis adalah membangun <em>relasi sehat</em> dengan teknologi: jadwal puasa media sosial, kanal konten yang terpilih, dan jeda kontemplatif setiap pekan.",
      "Pesantren memiliki posisi strategis untuk menjadi laboratorium kebiasaan ini. Lingkungan komunal, jadwal terstruktur, dan tradisi <em>riyadhah</em> memberikan ekosistem yang kondusif untuk membentuk hati yang tenang.",
      "Namun, pesantren juga harus menyadari bahwa santri bukanlah pulau terisolasi. Mereka akan kembali ke masyarakat yang riuh. Karena itu, yang dibutuhkan bukan pelarian dari teknologi, melainkan <strong>kepemimpinan spiritual</strong> di dalamnya.",
      "Al-Ghazali, sembilan abad lalu, menulis untuk masyarakat yang juga sedang bergulat dengan kompleksitas zamannya. Tulisan beliau bertahan karena menyentuh hal yang abadi: kebutuhan manusia akan ketenangan, makna, dan kedekatan dengan Tuhan. Generasi Z membutuhkan suara itu, mungkin lebih dari kapan pun.",
    ]),
  },
  {
    title: "Wisuda Tahfidz Akbar: 87 Santri Khatam 30 Juz",
    slug: "wisuda-tahfidz-akbar-87-santri",
    excerpt:
      "Haru bercampur syukur mewarnai prosesi wisuda tahfidz terbesar dalam sejarah pesantren.",
    category: "Pengumuman",
    tags: ["tahfidz", "wisuda", "santri"],
    featured_image:
      "https://images.unsplash.com/photo-1526857240196-22e10aaca8a3?auto=format&fit=crop&q=80&w=1600",
    daysAgo: 35,
    content: lorem([
      "Aula utama PPMH dipenuhi sorot lampu hangat dan suara isak tangis bahagia. Sebanyak 87 santri putra dan putri diwisuda sebagai penghafal 30 juz Al-Qur'an pada Sabtu pagi, menjadi prosesi wisuda tahfidz terbesar dalam sejarah pesantren.",
      "Acara dimulai dengan pembacaan ayat suci oleh perwakilan wisudawan termuda, baru berusia 13 tahun. Suaranya yang merdu mengundang lantunan amin yang serempak dari ribuan jamaah yang hadir.",
      "Setiap wisudawan menjalani ujian akhir berupa <em>simaan</em> 30 juz dalam 30 jam, dilakukan secara bertahap selama tiga hari. Penguji terdiri dari ulama tahfidz dari berbagai pesantren mitra di Jawa Barat.",
      "Tahun ini, satu wisudawati istimewa: Aisyah, santriwati tunanetra asal Lombok, menyelesaikan hafalannya menggunakan Al-Qur'an Braille. Kisahnya menjadi inspirasi seluruh hadirin tentang kekuatan tekad dan dukungan komunitas.",
      "Pengasuh menyampaikan pesan haru bahwa hafalan adalah amanah seumur hidup. “Khatam bukan akhir, melainkan awal pertanggungjawaban. Jaga ia dengan murajaah dan amalan,” pesannya.",
      "Para wali santri yang hadir tidak kuasa menahan air mata. Banyak yang berdiri memeluk anaknya begitu prosesi selesai, mengucapkan syukur tak terhingga atas perjalanan panjang yang dijalani bersama.",
      "Pesantren akan memfasilitasi para khufadz baru ini melalui program <em>kader pengajar tahfidz</em> selama satu tahun. Mereka diharapkan mengajar adik-adik tingkat sekaligus mempertahankan hafalan melalui rutinitas mengajar.",
      "Sebagai penutup, seluruh hadirin melaksanakan <em>khataman bersama</em>, dengan setiap wisudawan membaca satu juz secara berurutan. Suasana sakral dan menggetarkan menutup hari yang akan dikenang sepanjang sejarah pondok.",
    ]),
  },
  {
    title: "Gerakan Hijau Santri: Menanam 10.000 Pohon di Lereng Bukit",
    slug: "gerakan-hijau-santri-10000-pohon",
    excerpt:
      "Aksi konservasi lingkungan terbesar pesantren, bekerja sama dengan komunitas adat setempat.",
    category: "Komunitas",
    tags: ["lingkungan", "konservasi", "kolaborasi"],
    featured_image:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=1600",
    daysAgo: 40,
    content: lorem([
      "Sabtu pagi yang sejuk, ratusan santri PPMH mendaki lereng bukit di belakang pesantren membawa bibit pohon dan cangkul. Hari itu adalah puncak <strong>Gerakan Hijau Santri</strong> dengan target menanam 10.000 pohon dalam satu hari.",
      "Aksi ini berkolaborasi dengan komunitas adat Sunda setempat yang telah lama menjaga hutan adat di area tersebut. Bibit yang ditanam beragam: mahoni, sengon, kopi, hingga pohon buah lokal seperti durian dan manggis.",
      "“Menanam pohon bukan sekadar aktivitas lingkungan, tetapi ibadah jangka panjang,” jelas KH. Abdul Hadi dalam sambutan pembukaan. Beliau mengutip hadits tentang menanam yang menjadi sedekah jariyah meski sang penanam telah tiada.",
      "Persiapan dilakukan tiga bulan sebelumnya. Tim santri agroforestri melakukan pemetaan lahan, analisis tanah, dan pemilihan jenis pohon yang sesuai dengan ekosistem lokal. Pendekatan ilmiah memastikan tingkat hidup pohon di atas 80 persen.",
      "Komunitas adat berperan sebagai pendamping spiritual dan teknis. Mereka mengajarkan cara menanam menurut kearifan lokal, doa-doa adat saat bibit pertama dimasukkan ke tanah, dan teknik pemeliharaan tanpa pestisida kimia.",
      "Setelah penanaman, setiap pohon di-<em>tag</em> dengan QR code yang terhubung ke aplikasi pemantauan. Santri yang menanam menjadi <em>guardian</em> pohon tersebut dan akan memantau pertumbuhannya selama tiga tahun ke depan.",
      "Inisiatif ini juga menghasilkan dimensi ekonomi. Hasil panen kopi dan buah dari pohon-pohon ini, ketika telah berbuah, akan menjadi sumber pendapatan untuk operasional pesantren dan dibagi adil dengan komunitas adat.",
      "Pengasuh menutup acara dengan doa dan harapan agar bukit ini menjadi <em>“hutan ilmu dan iman”</em>, tempat generasi mendatang belajar bahwa Islam adalah agama yang merawat bumi dengan penuh kasih sayang.",
    ]),
  },
  {
    title: "Perpustakaan Digital Santri: 12.000 Koleksi dalam Genggaman",
    slug: "perpustakaan-digital-santri-12000-koleksi",
    excerpt:
      "Peluncuran platform pustaka berbasis web yang menggabungkan kitab kuning klasik dan riset kontemporer.",
    category: "Inovasi",
    tags: ["literasi", "perpustakaan", "digital"],
    featured_image:
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&q=80&w=1600",
    daysAgo: 45,
    content: lorem([
      "PPMH meluncurkan <strong>Perpustakaan Digital Santri</strong>, platform berbasis web yang memuat 12.000 koleksi: kitab kuning klasik, jurnal akademik, buku kontemporer, hingga arsip kajian video pesantren selama 15 tahun terakhir.",
      "Platform ini dapat diakses melalui jaringan internal pesantren tanpa biaya. Fitur pencariannya cerdas: memungkinkan pencarian dalam teks Arab dengan dukungan harakat, serta pencarian lintas bahasa.",
      "“Kami ingin santri tidak terbatas oleh fisik buku. Sebuah hadits, ayat, atau kutipan kitab seharusnya bisa diakses dalam hitungan detik,” jelas Ustadz Mahmud, ketua tim digitalisasi.",
      "Proses pembangunan memakan waktu dua tahun. Tim relawan santri dan alumni IT melakukan pemindaian, OCR (optical character recognition), dan validasi teks satu per satu. Setiap kitab dipindai dengan resolusi tinggi agar tetap dapat dibaca jika gambar diperbesar.",
      "Untuk menjaga adab, akses kitab tertentu yang membutuhkan bimbingan tetap dibatasi dan hanya bisa dibuka setelah santri menyelesaikan kelas pengantar. Sistem mengikuti tradisi <em>sanad keilmuan</em> di pesantren.",
      "Selain teks, perpustakaan menyediakan ratusan rekaman kajian dengan transkrip otomatis. Santri yang berhalangan hadir dapat mengejar materi, sementara penyandang disabilitas pendengaran terbantu oleh transkrip tersebut.",
      "Statistik pengunaan menunjukkan tren positif. Sejak dibuka tiga bulan lalu, rata-rata 600 santri aktif harian, dengan total waktu baca kolektif mencapai 18.000 jam. Kategori paling populer: tafsir, fikih, dan pengembangan diri.",
      "Pesantren membuka kerja sama dengan pesantren lain yang ingin mengintegrasikan koleksinya. Visi jangka panjangnya adalah membentuk <em>jaringan perpustakaan digital pesantren se-Indonesia</em>, sebuah harta karun keilmuan yang dapat diakses oleh siapa saja yang haus ilmu.",
    ]),
  },
];

export const SEED_CATEGORIES = Array.from(
  new Set(SEED_POSTS.map((p) => p.category))
);
