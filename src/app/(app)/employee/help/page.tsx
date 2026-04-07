import { InstallCTA } from "@/components/pwa/install-cta";

export default function EmployeeHelpPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5">
      <section className="glass rounded-[2rem] p-5">
        <h1 className="text-2xl font-semibold">Ajuda e instalacao</h1>
        <p className="mt-2 text-sm text-muted">
          O Pointer funciona melhor quando esta na tela inicial do aparelho. Se camera ou localizacao nao estiverem
          liberadas, o proprio fluxo orienta como ativar.
        </p>
      </section>
      <InstallCTA standaloneOnly={false} />
    </div>
  );
}
