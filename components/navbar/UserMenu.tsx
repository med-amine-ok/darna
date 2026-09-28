"use client";

import useLoginModel from "@/hook/useLoginModal";
import useRegisterModal from "@/hook/useRegisterModal";
import useRentModal from "@/hook/useRentModal";
import Image from "next/image";
import { useRouter } from "@/navigation";

import { SafeUser } from "@/types";
import { signOut } from "next-auth/react";
import { useCallback, useState } from "react";
import { AiOutlineMenu } from "react-icons/ai";
import { MdAdminPanelSettings } from "react-icons/md";
import { useTranslations } from "next-intl";
import Avatar from "../Avatar";
import MenuItem from "./MenuItem";

type Props = {
  currentUser?: SafeUser | null;
};

function UserMenu({ currentUser }: Props) {
  const router = useRouter();
  const t = useTranslations("nav");
  const registerModel = useRegisterModal();
  const loginModel = useLoginModel();
  const rentModel = useRentModal();
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = useCallback(() => {
    setIsOpen((value) => !value);
  }, []);

  const onRent = useCallback(() => {
    if (!currentUser) {
      router.push("/login?mode=login");
      return;
    }

    setIsOpen(false);
    router.push("/become-a-host");
  }, [currentUser, router]);

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  return (
    <div className="relative">
      <div className="flex flex-row items-center gap-3">
        <div
          className="hidden md:block text-sm font-semibold py-2.5 px-4 rounded-full hover:bg-tertiary/20 text-primary transition cursor-pointer"
          onClick={onRent}
        >
          {t("becomeAHost")}
        </div>
        <button
          type="button"
          aria-label="User menu"
          onClick={toggleOpen}
          className="min-h-[44px] min-w-[44px] p-2.5 md:py-1 md:px-2 border border-tertiary/70 flex flex-row items-center justify-center gap-3 rounded-full cursor-pointer hover:shadow-md transition touch-manipulation bg-surface text-primary"
        >
          <AiOutlineMenu size={16} />
          <div className="hidden md:block">
            {currentUser?.image ? (
              <Avatar src={currentUser.image} userName={currentUser.name} />
            ) : currentUser ? (
              <Avatar src={null} userName={currentUser.name} />
            ) : (
              <div className="w-[30px] h-[30px] rounded-full bg-primary flex items-center justify-center text-white overflow-hidden">
                <svg
                  viewBox="0 0 32 32"
                  aria-hidden="true"
                  role="presentation"
                  focusable="false"
                  className="w-full h-full p-1 fill-current"
                >
                  <path d="m16 .7c-8.437 0-15.3 6.863-15.3 15.3s6.863 15.3 15.3 15.3 15.3-6.863 15.3-15.3-6.863-15.3-15.3-15.3zm0 28c-4.021 0-7.605-1.884-9.933-4.81a12.425 12.425 0 0 1 6.45-4.4 6.5 6.5 0 0 1 -3.017-5.49c0-3.584 2.916-6.5 6.5-6.5s6.5 2.916 6.5 6.5a6.5 6.5 0 0 1 -3.017 5.49 12.425 12.425 0 0 1 6.45 4.4c-2.328 2.926-5.912 4.81-9.933 4.81z"></path>
                </svg>
              </div>
            )}
          </div>
        </button>
      </div>
      {isOpen && (
        <div className="absolute rounded-2xl shadow-xl w-[45vw] md:w-60 bg-surface overflow-hidden end-0 top-12 text-sm z-50 border border-tertiary/40">
          <div className="flex flex-col cursor-pointer py-1">
            {currentUser ? (
              <>
                <MenuItem
                  onClick={() => handleNavigate("/trips")}
                  label={t("myTrips")}
                />
                <MenuItem
                  onClick={() => handleNavigate("/messages")}
                  label={t("myMessages") || "Messages"}
                />
                <MenuItem
                  onClick={() => handleNavigate("/favorites")}
                  label={t("myFavorites")}
                />
                <MenuItem
                  onClick={() => handleNavigate("/reservations")}
                  label={t("myReservations")}
                />
                <MenuItem
                  onClick={() => handleNavigate("/properties")}
                  label={t("myProperties")}
                />
                <MenuItem
                  onClick={() => handleNavigate("/admin")}
                  label={t("adminPanel")}
                />
                <MenuItem onClick={onRent} label={t("airbnbYourHome")} />
                <hr className="my-1 border-neutral-100" />
                <MenuItem onClick={() => signOut()} label={t("logOut")} />
              </>
            ) : (
              <>
                <MenuItem
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/login?mode=login");
                  }}
                  label={t("logIn")}
                />
                <MenuItem
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/login?mode=register");
                  }}
                  label={t("signUp")}
                />
                <hr className="my-1 border-neutral-100" />
                <MenuItem
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/login?mode=login");
                  }}
                  label={t("airbnbYourHome")}
                />
                <MenuItem
                  onClick={() => handleNavigate("/admin")}
                  label={t("adminPanel")}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
