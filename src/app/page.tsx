import SearchForm from "@/components/SearchForm";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
      <div className="mb-12 text-center">
        <h1 className="font-[family-name:var(--font-playfair)] text-5xl font-bold tracking-tight text-primary sm:text-6xl">
          Luxury Lens
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground">
          Identify luxury products from any image with AI-powered visual
          recognition and market pricing.
        </p>
      </div>
      <SearchForm />
    </main>
  );
}
