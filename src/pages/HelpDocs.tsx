import { HelpCircle, Book, MessageSquare, ExternalLink, ChevronRight, Zap, Shield, Cloud, Upload, Database } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const gettingStartedSteps = [
  {
    icon: Database,
    title: "Tambah Akun Penyimpanan",
    description: "Hubungkan akun ImageKit Anda dengan menambahkan kredensial API",
  },
  {
    icon: Upload,
    title: "Unggah Berkas",
    description: "Gunakan Pusat Unggah untuk drag & drop atau jelajahi berkas untuk diunggah",
  },
  {
    icon: Cloud,
    title: "Kelola Berkas",
    description: "Jelajahi, pratinjau, dan organisasikan berkas Anda di Manajer Berkas",
  },
];

const faqs = [
  {
    question: "Bagaimana cara menambah akun ImageKit baru?",
    answer:
      "Pergi ke Akun Penyimpanan, klik 'Tambah Akun', dan masukkan Public Key, Private Key, dan URL Endpoint ImageKit Anda. Anda dapat menemukan ini di dashboard ImageKit di bagian Opsi Pengembang.",
  },
  {
    question: "Apakah private key saya aman?",
    answer:
      "Ya! Private key Anda dienkripsi sebelum disimpan di database dan hanya didekripsi di sisi server saat diperlukan untuk menandatangani permintaan unggah. Mereka tidak pernah terekspos ke browser.",
  },
  {
    question: "Bisakah saya menggunakan beberapa akun ImageKit?",
    answer:
      "Tentu saja! CloudOrchestrator mendukung beberapa akun penyimpanan. Tambahkan sebanyak yang Anda butuhkan dan beralih di antara mereka saat mengunggah berkas.",
  },
  {
    question: "Bagaimana cara mengorganisir berkas saya?",
    answer:
      "Gunakan fitur Kategori untuk membuat kategori kustom dengan warna. Anda kemudian dapat menetapkan kategori ke berkas Anda untuk organisasi dan penyaringan yang lebih baik.",
  },
  {
    question: "Tipe berkas apa yang didukung?",
    answer:
      "CloudOrchestrator mendukung semua tipe berkas yang diterima ImageKit, termasuk gambar (JPG, PNG, GIF, WebP, SVG), video (MP4, WebM), dan dokumen (PDF, dll.).",
  },
];

export default function HelpDocs() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Bantuan & Dokumentasi</h1>
        <p className="text-muted-foreground">Pelajari cara menggunakan CloudOrchestrator secara efektif</p>
      </div>

      {/* Getting Started */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Memulai
          </CardTitle>
          <CardDescription>Ikuti langkah-langkah ini untuk mengatur manajemen penyimpanan Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {gettingStartedSteps.map((step, index) => (
              <div key={index} className="relative p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full aurora-gradient text-white">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Pertanyaan yang Sering Diajukan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Resources */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass-card hover-scale cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Book className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Dokumentasi ImageKit</p>
                  <p className="text-sm text-muted-foreground">Dokumentasi API resmi ImageKit</p>
                </div>
              </div>
              <ExternalLink className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card hover-scale cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Hubungi Dukungan</p>
                  <p className="text-sm text-muted-foreground">Dapatkan bantuan dari tim kami</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Info */}
      <Card className="glass-card border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg aurora-gradient">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-lg">Praktik Keamanan Terbaik</h3>
              <ul className="mt-2 space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" />
                  Jaga kerahasiaan private key ImageKit Anda
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" />
                  Aktifkan autentikasi dua faktor untuk akun Anda
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" />
                  Tinjau dan rotasi kredensial API Anda secara berkala
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" />
                  Pantau log aktivitas Anda untuk tindakan mencurigakan
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
