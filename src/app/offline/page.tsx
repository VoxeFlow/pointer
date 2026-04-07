export default function OfflinePage() {
  return (
    <main className="safe-top flex min-h-screen items-center justify-center px-4 py-8">
      <div className="glass w-full max-w-md rounded-[2rem] p-6 text-center">
        <span className="inline-flex rounded-full bg-highlight/18 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-brand">
          Sem conexao
        </span>
        <h1 className="mt-4 text-3xl font-semibold">Voce esta offline</h1>
        <p className="mt-3 text-sm text-muted">
          Para manter a confiabilidade juridica do registro, o Pointer so confirma ponto quando a conexao com o
          servidor esta ativa.
        </p>
      </div>
    </main>
  );
}
