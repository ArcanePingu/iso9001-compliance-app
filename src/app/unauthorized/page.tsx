import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main>
      <h1>Unauthorized</h1>
      <p>You are signed in, but you do not have permission to access this page.</p>
      <Link href="/">Return to dashboard</Link>
    </main>
  );
}
