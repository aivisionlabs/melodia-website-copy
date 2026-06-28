import { CenterLogo } from "@/components/OptimizedLogo";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <section className="text-center" aria-labelledby="notfound-title">
        <CenterLogo
          alt="Melodia"
          className="w-auto h-auto md:h-20 mx-auto mb-6"
        />
        <h1 id="notfound-title" className="text-4xl font-bold mb-4">
          404
        </h1>
        <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
        <Link href="/" className="text-blue-500 hover:text-blue-700 underline">
          Return to Home
        </Link>
      </section>
    </main>
  );
}
