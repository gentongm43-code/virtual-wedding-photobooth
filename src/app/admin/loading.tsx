export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-6 py-8 sm:px-10 lg:px-12">
      <div className="h-4 w-32 rounded bg-[#dde5e1]" />
      <div className="mt-3 h-10 w-64 rounded bg-[#dde5e1]" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-72 rounded-[1.5rem] bg-[#e9eeec]" />
        ))}
      </div>
    </div>
  );
}
