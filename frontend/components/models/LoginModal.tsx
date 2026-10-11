"use client";

import React, { useCallback, useState } from "react";
import { useLoginModal } from "@/hook/useLoginModal";
import { useRegisterModal } from "@/hook/useRegisterModal";
import { useRouter } from "@/navigation";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { AiFillGithub } from "react-icons/ai";
import { FcGoogle } from "react-icons/fc";
import { toast } from "react-toastify";
import { useTranslations } from "next-intl";

import Button from "@/components/Button";
import Heading from "@/components/Heading";
import Input from "@/components/inputs/Input";
import Modal from "./Modal";
import Logo from "@/components/navbar/Logo";

export default function LoginModal() {
  const router = useRouter();
  const tNav = useTranslations("nav");
  const loginModal = useLoginModal();
  const registerModal = useRegisterModal();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      if (!res.ok) {
        throw new Error("Login failed");
      }

      const result = await res.json();
      const userName = result.user?.name || "Traveler";
      toast.success(`Welcome back, ${userName}!`);
      loginModal.onClose();
      window.location.reload();
    } catch {
      toast.error("Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `guest.${provider.toLowerCase()}@darna.dz`,
          name: `${provider} Traveler`,
        }),
      });
      if (res.ok) {
        toast.success(`Connected via ${provider}!`);
        loginModal.onClose();
        window.location.reload();
      }
    } catch {
      toast.error(`Could not sign in with ${provider}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = useCallback(() => {
    loginModal.onClose();
    registerModal.onOpen();
  }, [loginModal, registerModal]);

  const bodyContent = (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center mb-1">
        <Logo variant="vertical" interactive={false} />
      </div>
      <Heading
        title="Welcome to DARNA"
        subtitle="Log in to manage bookings, wishlists, and host settings"
        center
      />
      <Input
        id="email"
        label="Email"
        disabled={isLoading}
        register={register}
        errors={errors}
        required
      />
      <Input
        id="password"
        type="password"
        label="Password"
        disabled={isLoading}
        register={register}
        errors={errors}
        required
      />
    </div>
  );

  const footerContent = (
    <div className="flex flex-col gap-3 mt-3">
      <hr className="border-tertiary/40" />
      <Button
        outline
        label="Continue with Google"
        icon={FcGoogle}
        onClick={() => handleOAuthLogin("Google")}
      />
      <Button
        outline
        label="Continue with GitHub"
        icon={AiFillGithub}
        onClick={() => handleOAuthLogin("GitHub")}
      />
      <div className="text-neutral-500 text-center mt-3 font-normal text-sm">
        <div>
          First time using DARNA?{" "}
          <span
            onClick={toggle}
            className="text-primary font-semibold cursor-pointer hover:underline"
          >
            Create an account
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      disabled={isLoading}
      isOpen={loginModal.isOpen}
      title={tNav("login") || "Log in"}
      actionLabel="Continue"
      onClose={loginModal.onClose}
      onSubmit={handleSubmit(onSubmit)}
      body={bodyContent}
      footer={footerContent}
    />
  );
}
