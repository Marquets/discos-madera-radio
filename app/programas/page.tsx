import { Turntable } from "./Turntable";

export default function ProgramsPage() {
  return (
    <div className="flex min-h-[calc(100svh-var(--chrome))] flex-col bg-black px-4 pb-12 text-accent sm:px-8">
      <h1 className="sr-only">Programas</h1>
      <Turntable />
      <p className="mt-6 text-center font-display text-4xl uppercase sm:text-6xl">Coming soon</p>
    </div>
  );
}
