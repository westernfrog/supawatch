"use client";

import { useState } from "react";
import { Dialog } from "@headlessui/react";
import {
  ArrowUpRightIcon,
  Bars2Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

const navigation = [
  { name: "Trending", href: "/" },
  { name: "Top IMDB", href: "/" },
  { name: "Upcoming", href: "/" },
];

const social = [
  { name: "Instagram", href: "https://instagram.com/iam__amansingh" },
  { name: "LinkedIn", href: "https://linkedin.com/in/aman-singh123" },
  { name: "Github", href: "https://github.com/westernfrog" },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <nav
        className="flex items-center justify-between text-white lg:px-16 p-6"
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
            <Bars2Icon className="h-6 w-6 text-gray-300" aria-hidden="true" />
          </button>
        </div>
        <div className="hidden lg:flex lg:gap-x-20">
          {navigation.map((item, index) => (
            <Link key={index} href={item.href} className="font-medium">
              {item.name}
            </Link>
          ))}
        </div>
        <div className="hidden lg:flex lg:flex-1 lg:justify-end">
          <Link href="/" className="font-medium">
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
        <Dialog.Panel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-black/70 backdrop-blur px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
          <div className="flex items-center justify-between">
            <Link href="/" className="-m-1.5 px-1.5 flex items-center gap-2">
              <span className="sr-only">Supawatch</span>
              <h1 className="font-semibold uppercase tracking-tighter text-gray-300">
                Supawatch
              </h1>
            </Link>
            <button
              type="button"
              className="-m-2.5 rounded-md p-2.5 text-gray-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sr-only">Close menu</span>
              <XMarkIcon
                className="h-6 w-6 stroke-gray-300"
                aria-hidden="true"
              />
            </button>
          </div>
          <div className="my-10 flow-root">
            <div className="space-y-4 text-gray-300 divide-y">
              {navigation.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className="flex items-center justify-between tracking-tight font-medium pt-6"
                >
                  {item.name}
                  <ArrowUpRightIcon className="w-5 h-5" />
                </Link>
              ))}
            </div>
          </div>
          <div className="absolute bottom-10 left-0 right-0">
            <div className="flex items-center justify-center font-medium gap-6 text-gray-300">
              {social.map((item, index) => (
                <Link
                  target="_blank"
                  key={index}
                  href={item.href}
                  className="flex"
                >
                  {item.name} <ArrowUpRightIcon className="w-3 h-3" />
                </Link>
              ))}
            </div>
          </div>
        </Dialog.Panel>
      </Dialog>
    </header>
  );
}
