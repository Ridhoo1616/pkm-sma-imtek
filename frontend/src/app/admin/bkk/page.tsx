import { redirect } from "next/navigation";

/** Menu BKK di panel tinggal daftar perusahaan mitra. */
export default function HalamanBkk() {
  redirect("/admin/bkk/mitra");
}
