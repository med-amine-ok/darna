"use client";

import React, { useCallback, useState } from "react";
import { useLoginModal } from "@/hook/useLoginModal";
import { useRegisterModal } from "@/hook/useRegisterModal";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { BrandGoogleIcon, BrandGithubIcon } from "@/components/icons";
import { toast } from "react-toastify";
import { useTranslations } from "next-intl";

import Button from "@/components/Button";
import Heading from "@/components/Heading";
import Input from "@/components/inputs/Input";
import Modal from "./Modal";
import Logo from "@/components/navbar/Logo";

export default function RegisterModal() {
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const tNav = useTranslations("nav");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      });

      if (!res.ok) {
        throw new Error("Registration failed");
      }

      const result = await res.json();
      const userName = result.user?.name || data.name || "Traveler";
      toast.success(`Account created! Welcome to DARNA, ${userName}!`);
      registerModal.onClose();
      window.location.reload();
    } catch {
      toast.error("Could not create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthRegister = async (provider: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${provider} Traveler`,
          email: `traveler.${provider.toLowerCase()}@darna.dz`,
        }),
      });
      if (res.ok) {
        toast.success(`Account registered via ${provider}!`);
        registerModal.onClose();
        window.location.reload();
      }
    } catch {
      toast.error(`Could not sign up with ${provider}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = useCallback(() => {
    registerModal.onClose();
    loginModal.onOpen();
  }, [loginModal, registerModal]);

  const bodyContent = (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center mb-1">
        <Logo variant="vertical" interactive={false} />
      </div>
      <Heading
        title="Welcome to DARNA"
        subtitle="Create an account to unlock instant bookings across Algeria"
        center
      />
      <Input
        id="name"
        label="Full Name"
        disabled={isLoading}
        register={register}
        errors={errors}
        required
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
        icon={BrandGoogleIcon}
        onClick={() => handleOAuthRegister("Google")}
      />
      <Button
        outline
        label="Continue with GitHub"
        icon={BrandGithubIcon}
        onClick={() => handleOAuthRegister("GitHub")}
      />
      <div className="text-neutral-500 text-center mt-3 font-normal text-sm">
        <div>
          Already have an account?{" "}
          <span
            onClick={toggle}
            className="text-primary font-semibold cursor-pointer hover:underline"
          >
            Log in
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      disabled={isLoading}
      isOpen={registerModal.isOpen}
      title={tNav("signUp") || "Sign up"}
      actionLabel="Continue"
      onClose={registerModal.onClose}
      onSubmit={handleSubmit(onSubmit)}
      body={bodyContent}
      footer={footerContent}
    />
  );
}
