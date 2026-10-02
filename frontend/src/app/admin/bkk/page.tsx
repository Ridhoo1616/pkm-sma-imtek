import { redirect } from "next/navigation";

/** Menu BKK dibuka pada pekerjaan yang paling sering: memproses lamaran. */
export default function HalamanBkk() {
  redirect("/admin/bkk/lamaran");
}
