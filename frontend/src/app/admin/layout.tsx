import { PenyediaSesi } from "@/komponen/Sesi";
import { PenyediaKabar } from "@/komponen/Kabar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel Admin",
  // Halaman panel tidak boleh masuk hasil pencarian.
  robots: { index: false, follow: false },
};

export default function TataLetakAdmin({ children }: LayoutProps<"/admin">) {
  return (
    <PenyediaSesi>
      <PenyediaKabar>{children}</PenyediaKabar>
    </PenyediaSesi>
  );
}
