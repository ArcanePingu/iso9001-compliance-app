import { signInWithPassword } from "@/app/auth/actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ next?: string; error?: string }>;
}) {
  const params = (await searchParams) ?? {};

  return (
    <main style={{ maxWidth: 420, margin: "3rem auto", padding: "0 1rem" }}>
      <h1>Sign in</h1>
      <p>Please use your email and password.</p>
      {params.error && <p style={{ color: "crimson" }}>{params.error}</p>}

      <form action={signInWithPassword}>
        <label htmlFor="email">Email</label>
        <br />
        <input id="email" name="email" type="email" required />
        <br />
        <br />

        <label htmlFor="password">Password</label>
        <br />
        <input id="password" name="password" type="password" required />
        <input type="hidden" name="next" value={params.next ?? "/clauses"} />
        <br />
        <br />

        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}
