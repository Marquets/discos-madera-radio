import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacidad · Discos Madera Radio" };

const link = "underline decoration-2 underline-offset-4";

export default function PrivacidadPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-8 pb-16 sm:px-8">
      <h1 className="pb-4 text-center font-display text-6xl uppercase leading-none sm:text-8xl">Privacidad</h1>
      <p>Discos Madera Radio es una web hecha entre amigos, sin cuentas, sin anuncios y sin analítica. Esto es todo lo que guarda y usa.</p>

      <h2 className="font-display text-3xl uppercase">Lo que guarda la web</h2>
      <ul className="flex list-disc flex-col gap-2 pl-5">
        <li>Los mensajes que dejas en la portada: el texto y la hora. Se borran solos a los 7 días.</li>
        <li>
          Los mensajes de voz que dejas en el buzón: la grabación, de hasta 30 segundos (60 si subes un audio ya grabado), y la hora. Los puede escuchar cualquiera en la web y suenan en la radio. Se borran solos a los 7
          días, y podemos borrar antes el que no deba estar. El micrófono solo se usa mientras grabas.
        </li>
        <li>Los temas que añades en Pon un tema, con el nombre que escribas, si escribes uno. Se ven en la radio.</li>
        <li>
          Tu dirección IP solo se usa un momento, en memoria, para que no se pueda enviar muchas veces seguidas. No se guarda. El alojamiento (Netlify) puede registrarla en sus
          registros técnicos.
        </li>
      </ul>

      <h2 className="font-display text-3xl uppercase">Lo que guarda tu navegador</h2>
      <ul className="flex list-disc flex-col gap-2 pl-5">
        <li>Una cookie con la cadena que eliges (Normal o Navidad).</li>
        <li>Tus preferencias, en el almacenamiento local: el volumen, si escuchas por Spotify o YouTube y por qué animación va el logo.</li>
      </ul>

      <h2 className="font-display text-3xl uppercase">Spotify y YouTube</h2>
      <p>
        La música suena con el reproductor de Spotify o con el de YouTube, que se cargan desde sus servidores y pueden poner sus propias cookies. Esta web usa los servicios de la API de
        YouTube: al escuchar por YouTube aceptas las{" "}
        <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer" className={link}>
          Condiciones de servicio de YouTube
        </a>
        , y lo que hace Google con tus datos lo explica su{" "}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className={link}>
          Política de privacidad
        </a>
        . Lo de Spotify está en su{" "}
        <a href="https://www.spotify.com/es/legal/privacy-policy/" target="_blank" rel="noreferrer" className={link}>
          Política de privacidad
        </a>
        .
      </p>
    </div>
  );
}
