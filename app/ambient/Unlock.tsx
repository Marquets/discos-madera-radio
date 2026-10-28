"use client";

import { useActionState } from "react";
import { unlock } from "./actions";

export function Unlock() {
  const [error, action, pending] = useActionState(unlock, "");
  return (
    <form action={action} className="m-auto flex flex-col gap-2 font-mono text-xs uppercase">
      <label htmlFor="ambient-password">Contraseña</label>
      <div className="flex gap-2">
        <input
          id="ambient-password"
          name="password"
          type="password"
          required
          autoFocus
          className="min-w-0 flex-1 border border-accent bg-black px-2 py-1.5 text-accent focus-visible:outline-2 focus-visible:outline-accent"
        />
        <button disabled={pending} className="bg-accent px-3 py-1.5 font-bold text-black hover:bg-white">Entrar</button>
      </div>
      <p aria-live="polite" className="text-accent">{error}</p>
    </form>
  );
}
