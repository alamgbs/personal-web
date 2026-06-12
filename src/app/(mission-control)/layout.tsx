/**
 * Mission Control route group layout — sidebar shell.
 * Wraps all /mission-control/* pages.
 * Sidebar navigation and top bar will be wired in here.
 */
export default function MissionControlLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh">
      {/* TODO: <Sidebar /> */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
