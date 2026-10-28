import { Suspense } from "react";
import { cookies } from "next/headers";
import { Ambient } from "./Ambient";
import { Unlock } from "./Unlock";

async function Gate() {
  const password = process.env.AMBIENT_PASSWORD;
  const unlocked = password && (await cookies()).get("ambient")?.value === password;
  return unlocked ? <Ambient /> : <Unlock />;
}

export default function AmbientPage() {
  return (
    <div id="ambient" className="relative flex min-h-[calc(100svh-var(--chrome))] flex-col bg-fondo px-4 pb-12 text-line sm:px-8 lg:pb-8">
      <h1 className="sr-only">Ambient</h1>
      <Suspense>
        <Gate />
      </Suspense>
    </div>
  );
}
