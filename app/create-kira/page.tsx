import { redirect } from "next/navigation";

export const metadata = {
  title: "Create your Kira — Kira",
};

export default function CreateKiraRedirect() {
  redirect("/start");
}
