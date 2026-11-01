import Image from "next/image";
import leCiel from "@/public/tools/le-ciel.jpg";

// The collective's tools, each on its own site; a card per tool, its picture taken from the site itself
const TOOLS = [
  {
    name: "Le Ciel",
    href: "https://lecielambient.netlify.app/",
    image: leCiel,
    about: "Un sinte generativo con un cielo de nubes que reacciona al sonido",
  },
];

export default function ToolsPage() {
  return (
    <div className="px-4 pb-16 sm:px-8">
      <h1 className="pt-8 pb-10 text-center font-display text-7xl uppercase leading-none sm:text-9xl">Madera Tools</h1>
      <ul className="mx-auto grid max-w-5xl gap-x-8 gap-y-12 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <li key={tool.href}>
            <a href={tool.href} className="group flex flex-col gap-3">
              <div className="overflow-hidden border-2 border-black bg-black">
                <Image
                  src={tool.image}
                  alt={`${tool.name}, en miniatura`}
                  sizes="(min-width: 640px) 32rem, 100vw"
                  placeholder="blur"
                  className="w-full transition-transform group-hover:scale-105 motion-reduce:transition-none"
                />
              </div>
              <h2 className="font-display text-3xl uppercase leading-none decoration-2 group-hover:underline">{tool.name} ↗</h2>
              <p className="text-sm">{tool.about}</p>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
