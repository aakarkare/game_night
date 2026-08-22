export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-fuchsia-950 px-6 text-white">
      <div className="max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-fuchsia-300">Game Night</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Welcome to Game Night</h1>
        <p className="mt-4 text-lg text-slate-200">
          Choose your experience and get the party started.
        </p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <a
            href="/host?roomCode=GAMENIGHT"
            className="rounded-xl bg-fuchsia-500 px-5 py-3 font-semibold text-white transition hover:bg-fuchsia-400"
          >
            Open Host View
          </a>
          <a
            href="/play"
            className="rounded-xl border border-slate-600 bg-slate-900/60 px-5 py-3 font-semibold text-white transition hover:border-slate-400"
          >
            Join as Player
          </a>
        </div>
      </div>
    </main>
  );
}
