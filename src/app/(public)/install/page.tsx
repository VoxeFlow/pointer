import { InstallCTA } from "@/components/pwa/install-cta";
import { BrandMark } from "@/components/ui/brand-mark";

export default function InstallPage() {
  return (
    <main className="safe-top px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-xl flex-col gap-6">
        <section className="glass rounded-[2rem] bg-[radial-gradient(circle_at_12%_18%,rgba(212,173,91,0.34),transparent_10%),linear-gradient(160deg,rgba(17,17,17,0.98),rgba(5,5,5,0.96))] p-6 text-white">
          <BrandMark href="/" mode="full" theme="light" priority />
          <h1 className="mt-3 text-3xl font-semibold">Leve o Pointer para a tela inicial</h1>
          <p className="mt-3 text-sm text-white/80">
            No Android o app oferece instalacao quando o navegador permitir. No iPhone, o Pointer orienta o caminho
            correto para adicionar a tela inicial sem promessas irreais.
          </p>
        </section>

        <InstallCTA standaloneOnly={false} />

        <section className="glass rounded-[2rem] p-5">
          <h2 className="text-lg font-semibold">Por que instalar?</h2>
          <div className="mt-4 grid gap-3 text-sm text-muted">
            <p>Abertura mais rapida direto da tela inicial do celular.</p>
            <p>Interface em modo standalone quando o dispositivo suportar.</p>
            <p>Experiencia mais parecida com app nativo, sem depender de App Store ou Google Play.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
