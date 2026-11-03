# Lunaria

Landing page + dasbor demo untuk Lunaria, platform manajemen keuangan freelance dan UKM.
Dibuat murni dengan HTML, CSS, dan JavaScript — tanpa build step.

## Menjalankan

Buka `index.html` langsung di peramban (atau lewat preview di GripHub).
Tidak ada dependensi runtime; font Plus Jakarta Sans dimuat dari Google Fonts.

## Struktur

```
lunaria/
├── index.html      Landing page (hero, fitur, testimoni, harga, FAQ, footer)
├── styles.css      Token desain + gaya landing page
├── landing.js      Header, menu mobile, akordeon FAQ, reveal on scroll, count-up
├── dashboard.html  Dasbor demo
├── dashboard.css   Gaya khusus dasbor
└── dashboard.js    Data dummy, grafik SVG, tabel, localStorage, ekspor CSV
```

## Catatan teknis

- **Token desain** ada di `:root` pada `styles.css` (warna, skala tipografi, radius,
  easing). Arah visual: dark "night ledger" dengan aksen violet→biru.
- **Penyimpanan**: transaksi dasbor disimpan di `localStorage` dengan kunci
  `lunaria.transactions.v1`. Tombol *Reset data demo* mengembalikan data awal.
- **Aksesibilitas**: skip link, landmark semantik, tabel dengan `caption` + `scope`,
  akordeon memakai `aria-expanded`/`aria-controls`, modal dengan fokus terkelola,
  dan `prefers-reduced-motion` dihormati (animasi & skeleton dimatikan).
- **Grafik** digambar sebagai SVG di `dashboard.js` sehingga tidak butuh pustaka
  chart; ada tooltip saat kursor di atas bulan.
- **SEO**: title, meta description, Open Graph/Twitter, JSON-LD `SoftwareApplication`.
  Untuk produksi, tambahkan `og-cover.png` 1200×630 di folder ini.

## Uji cepat

```bash
python3 -m http.server 8000   # lalu buka http://127.0.0.1:8000
```

## Aset sosial

`og-cover.html` adalah sumber gambar Open Graph 1200×630; hasil render ada di
`og-cover.png` (dipakai `og:image` di `index.html`).
