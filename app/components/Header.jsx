"use client";

import { useState } from "react";
import { Dialog } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import Image from "next/image";

const navigation = [
  { name: "Trending", href: "/" },
  { name: "Top IMDB", href: "/" },
  { name: "Upcoming", href: "/" },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 ">
      <nav
        className="flex items-center justify-between px-16 py-6 text-white"
        aria-label="Global"
      >
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 px-1.5 flex items-center gap-2">
            <span className="sr-only">Supawatch</span>
            <h1 className="font-semibold uppercase tracking-tighter">
              Supawatch
            </h1>
          </Link>
        </div>
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
            <Bars3Icon className="h-6 w-6 text-gray-300" aria-hidden="true" />
          </button>
        </div>
        <div className="hidden lg:flex lg:gap-x-20">
          {navigation.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="text-sm font-semibold"
            >
              {item.name}
            </Link>
          ))}
        </div>
        <div className="hidden lg:flex lg:flex-1 lg:justify-end">
          <Link href="/" className="text-sm font-semibold">
            Search
          </Link>
        </div>
      </nav>
      <Dialog
        as="div"
        className="lg:hidden"
        open={mobileMenuOpen}
        onClose={setMobileMenuOpen}
      >
        <div className="fixed inset-0 z-10" />
        <Dialog.Panel className="fixed inset-y-0 right-0 z-10 w-full overflow-y-auto bg-[#0e0e0e] px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
          <div className="flex items-center justify-between">
            <Link href="/" className="-m-1.5 p-1.5">
              <span className="sr-only">Supawatch</span>
              <Image
                className="h-8 w-auto"
                src="https://cdn-icons-png.flaticon.com/512/5079/5079866.png"
                alt="Logo"
                width={50}
                height={50}
              />
            </Link>
            <button
              type="button"
              className="-m-2.5 rounded-md p-2.5 text-gray-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sr-only">Close menu</span>
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-6 flow-root">
            <div className="-my-6 divide-y divide-gray-500/10">
              <div className="space-y-2 py-6">
                {navigation.map((item, index) => (
                  <Link
                    key={index}
                    href={item.href}
                    className="block text-sm leading-6"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
              <div className="py-6">
                <Link
                  href="/"
                  className="block text-sm leading-6 text-gray-900"
                >
                  Search
                </Link>
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </Dialog>
    </header>
  );
}
