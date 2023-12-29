"use client";

import { useState } from "react";
import { Dialog } from "@headlessui/react";
import {
  ArrowUpRightIcon,
  Bars2Icon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

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
            <h1 className="font-bold uppercase tracking-tighter text-xl text-white/90">
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
            <MagnifyingGlassIcon
              className="h-5 w-5 stroke-white/70"
              strokeWidth={3}
              aria-hidden="true"
            />
          </button>
        </div>
        <div className="hidden lg:flex lg:flex-1 lg:justify-end">
          <Link
            href="/search"
            className="font-medium tracking-tighter text-xl text-white/70"
          >
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
        <Dialog.Panel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-[#010101]/90 px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
          <div className="flex items-center justify-between">
            <Link href="/" className="-m-1.5 px-1.5 flex items-center gap-2">
              <span className="sr-only">Supawatch</span>
              <h1 className="font-bold uppercase tracking-tighter text-xl text-white/30">
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
                className="h-5 w-5 stroke-white/40"
                strokeWidth={3}
                aria-hidden="true"
              />
            </button>
          </div>
          <div className="text-white">haha</div>
        </Dialog.Panel>
      </Dialog>
    </header>
  );
}
