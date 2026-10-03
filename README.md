# Hadir — Absensi Organisasi

Aplikasi absensi organisasi berbasis QR. Anggota mencatat kehadiran lewat QR, sedangkan admin mengelola anggota, kegiatan, sesi QR, dan rekap.

## Menjalankan aplikasi

1. Buat Firebase project, aktifkan Cloud Firestore dalam Native mode, lalu buat service account dengan akses Firestore. Simpan file service account di luar folder project.
2. Salin `.env.example` menjadi `.env.local`, lalu isi `FIREBASE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS`, `JWT_SECRET`, `ADMIN_USERNAME`, dan `ADMIN_PASSWORD`.
3. Instal dan jalankan aplikasi:

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Login pertama dengan username/password dari `.env.local` akan membuat dokumen admin dengan password hash di Firestore. Setelah admin masuk, tambahkan anggota lewat menu **Anggota** dan kegiatan lewat menu **Kegiatan**.

## Data Firestore

Firestore memakai koleksi `admins`, `members`, `activities`, `attendance`, `qrSessions`, `sessionLogs`, `tasks`, `aiCredits`, dan `syncLogs`. Koleksi dibuat otomatis ketika data pertama disimpan.

Dokumen anggota memakai ID Anggota sebagai document ID dan berisi `nim`, `nama`, serta `kelas` (divisi/kelompok). Login anggota saat ini memakai ID Anggota. Password admin disimpan sebagai hash scrypt di koleksi `admins`.

Data Supabase lama tidak dimigrasikan; database Firebase dimulai kosong. Buat admin awal melalui variabel bootstrap di `.env.local`, lalu isi daftar anggota dan kegiatan dari panel admin.

Kredensial Firebase Admin SDK hanya digunakan oleh route server. Jangan commit file service account atau `.env.local`.
