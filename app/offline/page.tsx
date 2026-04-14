export default function OfflinePage() {
  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-6 py-12">
      <div className="bg-card w-full max-w-lg rounded-2xl border p-8 shadow-sm">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-[0.2em]">
          Offline
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Kino needs a connection for this screen.
        </h1>
        <p className="text-muted-foreground mt-4 text-sm leading-6">
          Previously viewed app pages and cached data remain available when
          possible. Reconnect to load uncached screens or save changes.
        </p>
      </div>
    </main>
  );
}
