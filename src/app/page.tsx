import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";

export default async function Home() {
  const { user } = await getSessionProfile();
  redirect(user ? "/dashboard" : "/login");
}
