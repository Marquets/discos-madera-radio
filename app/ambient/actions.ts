"use server";

import { cookies } from "next/headers";

export async function unlock(_: string, form: FormData) {
  if (form.get("password") !== process.env.AMBIENT_PASSWORD) return "Contraseña incorrecta";
  (await cookies()).set("ambient", process.env.AMBIENT_PASSWORD!, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 365, path: "/ambient" });
  return "";
}
