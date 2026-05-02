import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env') });
import { getActiveConnection, connInsertReturning } from './lib/dbConnections';

async function seed() {
  const posts = [
    {
      title: "Menumbuhkan Jiwa Kepemimpinan Santri di Era Digital",
      slug: "jiwa-kepemimpinan-santri",
      content: "<p>Di era digital yang serba cepat ini, santri Pondok Pesantren Miftahul Huda (PPMH) dibekali tidak hanya ilmu agama yang mendalam, namun juga keterampilan kepemimpinan.</p><p>Kami mengadakan berbagai lokakarya agar para santri siap berinovasi sambil tetap menjunjung tinggi nilai-nilai akhlakul karimah.</p>",
      excerpt: "Bagaimana PPMH membekali para santrinya dengan keterampilan kepemimpinan menghadapi tantangan era digital.",
      featured_image: "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=800",
      status: "published",
      category: "Edukasi",
      author_id: "admin",
      published_at: new Date().toISOString()
    },
    {
      title: "Prestasi Gemilang: PPMH Juara Umum Lomba Menulis Esai Nasional",
      slug: "prestasi-juara-umum-esai",
      content: "<p>Alhamdulillah, santri PPMH berhasil menyabet gelar Juara Umum pada Lomba Menulis Esai Tingkat Nasional 2026. Ini membuktikan bahwa literasi di lingkungan pesantren terus berkembang dengan sangat pesat.</p>",
      excerpt: "Santri PPMH meraih Juara Umum pada ajang menulis esai nasional.",
      featured_image: "https://images.unsplash.com/photo-1546410531-b4cafc5eec15?auto=format&fit=crop&q=80&w=800",
      status: "published",
      category: "Prestasi",
      author_id: "admin",
      published_at: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      title: "Kajian Mingguan: Menggali Makna Kesabaran",
      slug: "kajian-mingguan-kesabaran",
      content: "<p>Kajian rutin mingguan ini membahas kitab kuning klasik yang mengupas makna kesabaran dalam menghadapi ujian. Kesabaran bukan berarti diam, melainkan terus berusaha secara maksimal seraya bertawakal kepada Allah SWT.</p>",
      excerpt: "Ringkasan kajian rutin mingguan PPMH mengenai hakikat kesabaran.",
      featured_image: "https://images.unsplash.com/photo-1507676184212-d0330a151f84?auto=format&fit=crop&q=80&w=800",
      status: "published",
      category: "Kajian",
      author_id: "admin",
      published_at: new Date(Date.now() - 86400000 * 5).toISOString()
    }
  ];

  const c = getActiveConnection();
  if(!c) return console.log("No DB conn");
  for(const p of posts) {
     try {
       await connInsertReturning(c, "posts", [p]);
       console.log("Seeded:", p.title);
     }catch(e){
       console.log("Err:", e);
     }
  }
}

seed();
