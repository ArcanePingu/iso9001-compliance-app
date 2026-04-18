import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main style={{ maxWidth: 640, margin: "3rem auto", padding: "0 1rem" }}>
      <h1>Unauthorized</h1>
      <p>You are signed in, but you do not have permission to access this page.</p>
      <Link href="/">Return home</Link>
    </main>
  );
}
