import Link from "next/link";

export default function Footer(params) {
  const socials = [
    { href: "https://instagram.com/iam__amansingh", name: "Instagram" },
    { href: "https://github.com/westernfrog", name: "Github" },
    { href: "https://linkedin.com/in/aman-singh123", name: "LinkedIn" },
  ];
  return (
    <>
      <footer className="lg:flex-row flex-col items-center justify-between lg:px-16 p-6">
        <div>
          <Link href="/">
            <span className="sr-only">Supawatch</span>
            <h1 className="font-bold uppercase tracking-tighter text-xl text-white/90">
              Supawatch
            </h1>
            <p className="text-white/60">Made using TMDB</p>
          </Link>
        </div>
        <div className="flex items-center justify-between mt-4 lg:mt-0">
          {socials.map((item, index) => (
            <Link
              key={index}
              target="_blank"
              href={item.href}
              className="text-white/60"
            >
              {item.name}
            </Link>
          ))}
        </div>
      </footer>
    </>
  );
}
