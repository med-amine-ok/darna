"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useLoginModal } from "@/hook/useLoginModal";
import { useRegisterModal } from "@/hook/useRegisterModal";
import { useSearchModal } from "@/hook/useSearchModal";
import { useFilterModal } from "@/hook/useFilterModal";

// The global modals are heavy (auth panel, stepped search, filter sheet with slider and
// histogram) but rarely open. Keep them out of the layout bundle: each mounts the first
// time its store opens, and its code is prefetched when the browser is idle so that first
// open is still instant. Lighthouse: the eager versions made the layout chunk a 400 to
// 950 ms long task on every page.
const loadAuth = () => import("@/components/models/LoginModal");
const loadRegister = () => import("@/components/models/RegisterModal");
const loadSearch = () => import("@/components/models/SearchModal");
const loadFilter = () => import("@/components/models/FilterModal");

const LoginModal = dynamic(loadAuth, { ssr: false });
const RegisterModal = dynamic(loadRegister, { ssr: false });
const SearchModal = dynamic(loadSearch, { ssr: false });
const FilterModal = dynamic(loadFilter, { ssr: false });

export default function LazyModals() {
  const loginOpen = useLoginModal((s) => s.isOpen);
  const registerOpen = useRegisterModal((s) => s.isOpen);
  const searchOpen = useSearchModal((s) => s.isOpen);
  const filterOpen = useFilterModal((s) => s.isOpen);

  // Once mounted, a modal stays mounted so its exit animation and state behave as before.
  const [mounted, setMounted] = useState({ auth: false, search: false, filter: false });
  useEffect(() => {
    setMounted((m) => ({
      auth: m.auth || loginOpen || registerOpen,
      search: m.search || searchOpen,
      filter: m.filter || filterOpen,
    }));
  }, [loginOpen, registerOpen, searchOpen, filterOpen]);

  useEffect(() => {
    type IdleWindow = Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    const w = window as IdleWindow;
    const prefetch = () => {
      void loadAuth();
      void loadRegister();
      void loadSearch();
      void loadFilter();
    };
    const id = w.requestIdleCallback ? w.requestIdleCallback(prefetch, { timeout: 4000 }) : window.setTimeout(prefetch, 2500);
    return () => {
      if (!w.requestIdleCallback) window.clearTimeout(id);
    };
  }, []);

  return (
    <>
      {mounted.auth && (
        <>
          <LoginModal />
          <RegisterModal />
        </>
      )}
      {mounted.search && <SearchModal />}
      {mounted.filter && <FilterModal />}
    </>
  );
}
