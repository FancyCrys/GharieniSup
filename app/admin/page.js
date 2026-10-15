import { isAdmin, passwordConfigured } from "@/lib/auth";
import { usingMemory } from "@/lib/store";
import { uploadsEnabled, blobEnvNames } from "@/lib/files";
import LoginForm from "./LoginForm";
import Board from "./Board";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tickets · Gharieni Support" };

export default async function AdminPage() {
  const authed = await isAdmin();

  if (!authed) {
    return (
      <main className="wrap">
        <div className="login">
          <div className="brand">
            <span className="brand-dot" /> Gharieni Web Support
          </div>
          <h1>Admin login</h1>
          {!passwordConfigured() && (
            <div className="warn">Set ADMIN_PASSWORD in your Vercel environment variables, then redeploy.</div>
          )}
          <LoginForm />
        </div>
      </main>
    );
  }

  return <Board memoryWarning={usingMemory()} uploadsWarning={!uploadsEnabled()} blobEnv={blobEnvNames()} />;
}
