import SearchForm from "@/components/SearchForm";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-neutral-900">
          Luxury Lens
        </h1>
        <p className="mt-2 text-neutral-500">
          Paste an image URL to identify luxury products using AI-powered
          reverse image search.
        </p>
      </div>
      <SearchForm />
    </main>
  );
}
