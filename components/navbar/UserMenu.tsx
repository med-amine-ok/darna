"use client";

import useLoginModel from "@/hook/useLoginModal";
import useRegisterModal from "@/hook/useRegisterModal";
import useRentModal from "@/hook/useRentModal";
import Image from "next/image";
import { useRouter } from "@/navigation";

import { SafeUser } from "@/types";
import { signOut } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AiOutlineMenu, AiOutlineHeart } from "react-icons/ai";
import {
  MdAdminPanelSettings,
  MdOutlineLuggage,
  MdOutlineChatBubbleOutline,
  MdOutlineCalendarMonth,
  MdOutlineLogout,
  MdOutlineLogin,
  MdOutlinePersonAdd,
} from "react-icons/md";
import { useTranslations } from "next-intl";
import { BiUserCircle } from "react-icons/bi";
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
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleOpen = useCallback(() => {
    setIsOpen((value) => !value);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

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
    <div className="relative" ref={menuRef}>
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
          className="min-h-[46px] min-w-[46px] py-1.5 px-3 md:px-3.5 border border-tertiary/70 flex flex-row items-center justify-center gap-3 rounded-full cursor-pointer hover:shadow-md transition touch-manipulation bg-surface text-primary shadow-xs"
        >
          <AiOutlineMenu size={18} />
          <div className="hidden md:block">
            {currentUser?.image ? (
              <Avatar src={currentUser.image} userName={currentUser.name} size={32} />
            ) : currentUser ? (
              <Avatar src={null} userName={currentUser.name} size={32} />
            ) : (
              <div className="w-[32px] h-[32px] rounded-full bg-primary flex items-center justify-center text-white overflow-hidden">
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
        <div className="absolute rounded-2xl shadow-2xl w-[85vw] sm:w-[360px] md:w-[340px] bg-surface overflow-hidden end-0 top-14 text-sm z-50 border border-tertiary/40 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex flex-col cursor-pointer py-2.5">
            {currentUser ? (
              <>
                <MenuItem
                  onClick={() => handleNavigate("/profile")}
                  label={t("profile")}
                  icon={<BiUserCircle size={21} />}
                />
                <MenuItem
                  onClick={() => handleNavigate("/trips")}
                  label={t("myTrips")}
                  icon={<MdOutlineLuggage size={21} />}
                />
                <MenuItem
                  onClick={() => handleNavigate("/messages")}
                  label={t("myMessages") || "Messages"}
                  icon={<MdOutlineChatBubbleOutline size={21} />}
                />
                <MenuItem
                  onClick={() => handleNavigate("/favorites")}
                  label={t("myFavorites")}
                  icon={<AiOutlineHeart size={21} />}
                />
                <MenuItem
                  onClick={() => handleNavigate("/reservations")}
                  label={t("myReservations")}
                  icon={<MdOutlineCalendarMonth size={21} />}
                />
                <MenuItem
                  onClick={() => handleNavigate("/properties")}
                  label={t("myProperties")}
                  icon={
                    <Image
                      src="/assets/house.png"
                      alt="Properties"
                      width={22}
                      height={22}
                      className="w-[21px] h-[21px] object-contain"
                    />
                  }
                />
                <MenuItem
                  onClick={() => handleNavigate("/admin")}
                  label={t("adminPanel")}
                  icon={<MdAdminPanelSettings size={21} />}
                />
                <MenuItem
                  onClick={onRent}
                  label={t("airbnbYourHome")}
                  icon={
                    <Image
                      src="/assets/house.png"
                      alt="Host"
                      width={22}
                      height={22}
                      className="w-[21px] h-[21px] object-contain"
                    />
                  }
                />
                <hr className="my-2 border-tertiary/30 mx-3" />
                <MenuItem
                  onClick={() => signOut()}
                  label={t("logOut")}
                  icon={<MdOutlineLogout size={21} />}
                />
              </>
            ) : (
              <>
                <MenuItem
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/login?mode=login");
                  }}
                  label={t("logIn")}
                  icon={<MdOutlineLogin size={21} />}
                />
                <MenuItem
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/login?mode=register");
                  }}
                  label={t("signUp")}
                  icon={<MdOutlinePersonAdd size={21} />}
                />
                <hr className="my-2 border-tertiary/30 mx-3" />
                <MenuItem
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/login?mode=login");
                  }}
                  label={t("airbnbYourHome")}
                  icon={
                    <Image
                      src="/assets/house.png"
                      alt="Host"
                      width={22}
                      height={22}
                      className="w-[21px] h-[21px] object-contain"
                    />
                  }
                />
                <MenuItem
                  onClick={() => handleNavigate("/admin")}
                  label={t("adminPanel")}
                  icon={<MdAdminPanelSettings size={21} />}
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
