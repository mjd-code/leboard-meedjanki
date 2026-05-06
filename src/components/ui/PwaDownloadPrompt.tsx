"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, X } from "lucide-react";
import { Button } from "./button"; // Pastikan path ini sesuai dengan project-mu

export function PwaDownloadPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);

  useEffect(() => {
    // A. Cek apakah sudah dalam mode aplikasi (Standalone)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    if (isStandalone) {
      setIsStandaloneMode(true);
      return;
    }

    // B. Cek apakah pengguna sudah menekan "Nanti Saja" dalam 7 hari terakhir
    const checkDismissal = () => {
      const dismissedStr = localStorage.getItem("pwaPrompDismissedAt");
      if (dismissedStr) {
        const dismissedAt = parseInt(dismissedStr, 10);
        const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
        if (daysSince < 7) {
          return false; // Jangan tampilkan jika belum 7 hari
        }
      }
      return true;
    };

    // Tampilkan prompt jika syarat terpenuhi
    if (checkDismissal()) {
      setShowPrompt(true);
    }
  }, []);

  if (isStandaloneMode) {
    return null;
  }

  const handleInstallClick = () => {
    // Cek apakah pengguna menggunakan iOS
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    if (isIOS) {
      // iOS tidak mendukung APK, berikan instruksi PWA standar
      const instruction =
        "Untuk pengguna iOS/iPhone:\n\n1. Ketuk ikon 'Bagikan' (Share) di bawah layar.\n2. Pilih 'Tambahkan ke Layar Utama' (Add to Home Screen).";
      alert(instruction);
      setShowPrompt(false);
      return;
    }

    // Untuk pengguna Android / Desktop, langsung unduh file APK
    try {
      const link = document.createElement("a");
      link.href = "/app-release.apk"; // Pastikan file APK ada di folder /public
      link.download = "PPMH.apk"; // Nama file saat diunduh pengguna
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Sembunyikan prompt setelah klik unduh
      setShowPrompt(false);

      // Opsional: Tandai bahwa pengguna sudah mengunduh agar tidak ditawari terus
      localStorage.setItem("pwaPrompDismissedAt", Date.now().toString());
    } catch (e) {
      console.error("Gagal mengunduh APK", e);
    }
  };

  const handleLaterClick = () => {
    // Simpan waktu penolakan untuk cooldown 7 hari
    localStorage.setItem("pwaPrompDismissedAt", Date.now().toString());
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4 pointer-events-none flex justify-center"
        >
          <div className="bg-background/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl p-4 md:p-5 w-full max-w-lg pointer-events-auto flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex-1 text-center sm:text-left relative">
              <h3 className="font-semibold text-foreground text-sm md:text-base">
                Unduh Aplikasi PPMH (APK) untuk akses lebih cepat dan stabil!
              </h3>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                className="flex-1 sm:flex-none text-xs h-9 font-medium"
                onClick={handleLaterClick}
              >
                Nanti Saja
              </Button>
              <Button
                onClick={handleInstallClick}
                className="flex-1 sm:flex-none text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5 flex items-center"
              >
                <Download className="w-3.5 h-3.5" /> Unduh APK
              </Button>
            </div>
            <button
              onClick={handleLaterClick}
              className="absolute top-2 right-2 p-1 text-muted-foreground hover:bg-secondary rounded-full sm:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
