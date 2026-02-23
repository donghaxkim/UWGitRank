"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#f2f2f2] flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-2xl font-bold text-zinc-900 mb-2">
        Something went wrong
      </h2>
      <p className="text-zinc-500 mb-6 max-w-md">
        We hit an unexpected error. This is usually temporary — please try
        again.
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 transition-all active:scale-95 font-semibold"
      >
        Try again
      </button>
    </div>
  );
}
