import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[85dvh] flex flex-col items-center justify-center p-6 text-center">
      <div className="relative w-72 h-72 mb-6">
        <picture>
          <source
            media="(max-width: 640px)"
            srcSet="/assets/404-illustration-mobile.png"
          />
          <Image
            src="/assets/404-illustration.png"
            alt="Page not found"
            fill
            className="object-contain"
            priority
          />
        </picture>
      </div>
      <h1 className="text-3xl font-bold text-primary mb-2">Page Not Found</h1>
      <p className="text-sm text-neutral-600 max-w-md mb-8">
        We couldn't find the page you're looking for. It might have been moved or doesn't exist.
      </p>
      <Link
        href="/"
        className="px-8 py-3 rounded-full bg-accent text-white font-medium hover:bg-accent/90 transition shadow-sm"
      >
        Explore DARNA
      </Link>
    </div>
  );
}
