"use client";

import { useEffect, useState } from "react";
import { urlUnggahan } from "@/lib/api";

interface LayarPembukaProps {
  logoUrl?: string | null;
  namaSekolah?: string;
}

export function LayarPembuka({ logoUrl, namaSekolah = "SMA IMTEK" }: LayarPembukaProps) {
  const [tampil, setTampil] = useState(false);
  const [hilang, setHilang] = useState(false);

  useEffect(() => {
    // Mengecek apakah pengunjung baru pertama kali membuka tab ini
    const sudahPernah = sessionStorage.getItem("splash_ditampilkan");
    
    // Jika sudah pernah tayang di sesi ini, jangan lakukan apa-apa
    if (sudahPernah === "ya") return;

    // Jika belum, tampilkan splash screen
    setTampil(true);
    
    // Sembunyikan gulir halaman (scroll) selama splash screen aktif
    document.body.style.overflow = "hidden";

    // Mulai transisi hilang setelah 1.2 detik
    const timerHilang = setTimeout(() => {
      setHilang(true);
      document.body.style.overflow = "";
      // Baru tandai di memori SETELAH transisinya berhasil berjalan
      // (ini mencegah bug 'stuck' akibat React 18 Strict Mode double-mount)
      sessionStorage.setItem("splash_ditampilkan", "ya");
    }, 1200);

    // Hapus dari DOM sepenuhnya setelah 2 detik
    const timerHapus = setTimeout(() => {
      setTampil(false);
    }, 2000);

    return () => {
      clearTimeout(timerHilang);
      clearTimeout(timerHapus);
      document.body.style.overflow = "";
    };
  }, []);

  if (!tampil) return null;

  return (
    <>
      <style>
        {`
          @keyframes geserCahaya {
            0% { transform: translateX(-100%) skewX(-15deg); }
            100% { transform: translateX(200%) skewX(-15deg); }
          }
          @keyframes munculHalus {
            0% { opacity: 0; transform: translateY(20px) scale(0.95); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}
      </style>
      
      <div
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#061428] transition-all duration-[900ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${
          hilang ? "pointer-events-none opacity-0 scale-110" : "opacity-100 scale-100"
        }`}
      >
        {/* Latar Belakang Vektor Geometris */}
        <div className="absolute -top-[20%] -left-[10%] h-[700px] w-[700px] rounded-full bg-biru blur-[140px] opacity-40" aria-hidden="true" />
        <div className="absolute -bottom-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-emas blur-[160px] opacity-20" aria-hidden="true" />

        <div 
          className={`relative z-10 flex flex-col items-center transition-all duration-[800ms] ease-out delay-100 ${
            hilang ? "opacity-0 scale-150 blur-md" : "opacity-100 scale-100 blur-0"
          }`}
          style={{ animation: "munculHalus 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards" }}
        >
          {/* Wadah Logo dengan Aura Berdenyut */}
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-[2rem] bg-emas/30 animate-ping" style={{ animationDuration: "3s" }}></div>
            <div className="absolute inset-0 rounded-[2rem] bg-biru/40 animate-ping" style={{ animationDuration: "2.5s", animationDelay: "1s" }}></div>
            
            <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-[2rem] bg-white/5 p-4 shadow-2xl ring-1 ring-white/20 backdrop-blur-md">
              {/* Efek kilap kaca melintas di atas logo */}
              <div className="absolute inset-0 z-20 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-70 animate-[geserCahaya_2.5s_infinite]"></div>
              
              {logoUrl ? (
                <img
                  src={urlUnggahan("profil", logoUrl)}
                  alt="Logo Sekolah"
                  className="relative z-10 h-full w-full object-contain drop-shadow-lg"
                />
              ) : (
                <span className="relative z-10 text-4xl font-black text-white drop-shadow-md">
                  {namaSekolah.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* Teks Sekolah dengan efek bersinar */}
          <div className="relative text-center">
            <p className="mb-1 text-[10px] font-bold tracking-[0.3em] text-emas/80 uppercase">
              SELAMAT DATANG DI
            </p>
            <h1 className="text-2xl font-black tracking-wider text-white sm:text-3xl">
              {namaSekolah}
            </h1>
          </div>

          {/* Garis Loading Minimalis */}
          <div className="mt-10 h-0.5 w-48 overflow-hidden rounded-full bg-white/10">
            <div 
              className="h-full bg-emas transition-all duration-[1200ms] ease-out"
              style={{ width: hilang ? "100%" : "70%" }} 
            />
          </div>
        </div>
      </div>
    </>
  );
}
