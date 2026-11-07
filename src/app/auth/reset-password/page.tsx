import { redirect } from "next/navigation";
export default function ResetPasswordPage() { redirect("/account?mode=forgot"); }
