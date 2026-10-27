import { Ambient } from "./Ambient";

export default function AmbientPage() {
  return (
    <div id="ambient" className="relative flex min-h-[calc(100svh-var(--chrome))] flex-col bg-black px-4 pb-12 text-accent sm:px-8">
      <h1 className="sr-only">Ambient</h1>
      <Ambient />
    </div>
  );
}
