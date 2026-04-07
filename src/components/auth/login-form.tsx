export function LoginForm({
  tenantSlug,
  error,
}: {
  tenantSlug?: string;
  error?: string | null;
}) {
  return (
    <form action="/api/auth/login-form" method="POST" className="grid gap-4">
      {tenantSlug ? <input type="hidden" name="tenantSlug" value={tenantSlug} /> : null}

      <label className="grid gap-2">
        <span className="text-sm font-medium text-white/82">Login</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-[1.15rem] border border-white/12 bg-[#101010] px-4 py-4 text-white outline-none transition placeholder:text-white/28 focus:border-[#d4ad5b] focus:bg-[#0d0d0d]"
          placeholder="voce@empresa.com"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-white/82">Senha</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-[1.15rem] border border-white/12 bg-[#101010] px-4 py-4 text-white outline-none transition placeholder:text-white/28 focus:border-[#d4ad5b] focus:bg-[#0d0d0d]"
          placeholder="Sua senha"
        />
      </label>

      {error ? (
        <p className="rounded-[1rem] border border-[#7a2d2d] bg-[#2a1414] px-4 py-3 text-sm text-[#ffb7b7]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="mt-2 rounded-[1.15rem] bg-[#d4ad5b] px-4 py-4 font-semibold text-black transition hover:brightness-105"
      >
        Entrar
      </button>
    </form>
  );
}
