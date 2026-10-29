"use client";

import React, { useCallback, useState } from "react";
import { useLoginModal } from "@/hook/useLoginModal";
import { useRegisterModal } from "@/hook/useRegisterModal";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { BrandGoogleIcon, BrandGithubIcon } from "@/components/icons";
import { toast } from "react-toastify";
import { useTranslations } from "next-intl";
import { useActionError } from "@/hook/useActionError";

import Button from "@/components/Button";
import Heading from "@/components/Heading";
import Input from "@/components/inputs/Input";
import Modal from "./Modal";
import Logo from "@/components/navbar/Logo";

export default function LoginModal() {
  const t = useTranslations("modals.login");
  const errorText = useActionError();
  const isLoginOpen = useLoginModal((s) => s.isOpen);
  const closeLogin = useLoginModal((s) => s.onClose);
  const openRegister = useRegisterModal((s) => s.onOpen);
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

      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(errorText(result, t("genericError")));
        return;
      }

      const userName = typeof result.user?.name === "string" ? result.user.name : "";
      toast.success(userName ? t("welcomeBackName", { name: userName }) : t("success"));
      closeLogin();
      window.location.reload();
    } catch {
      toast.error(t("genericError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = (provider: string) => {
    // Social sign-in is not available yet in the mock backend.
    toast.info(t("oauthComingSoon", { provider }));
  };

  const toggle = useCallback(() => {
    closeLogin();
    openRegister();
  }, [closeLogin, openRegister]);

  const bodyContent = (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center mb-1">
        <Logo variant="vertical" interactive={false} />
      </div>
      <Heading
        title={t("title")}
        subtitle={t("subtitle")}
        center
      />
      <Input
        id="email"
        label={t("email")}
        type="email"
        autoComplete="email"
        disabled={isLoading}
        register={register}
        errors={errors}
        required
      />
      <Input
        id="password"
        type="password"
        label={t("password")}
        autoComplete="current-password"
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
        label={t("continueGoogle")}
        icon={BrandGoogleIcon}
        onClick={() => handleOAuthLogin("Google")}
      />
      <Button
        outline
        label={t("continueGithub")}
        icon={BrandGithubIcon}
        onClick={() => handleOAuthLogin("GitHub")}
      />
      <div className="text-neutral-600 text-center mt-3 font-normal text-sm">
        <div>
          {t("firstTime")}{" "}
          <button
            type="button"
            onClick={toggle}
            className="text-primary font-semibold cursor-pointer hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
          >
            {t("createAccount")}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      disabled={isLoading}
      isOpen={isLoginOpen}
      title={t("modalTitle")}
      actionLabel={t("continue")}
      onClose={closeLogin}
      onSubmit={handleSubmit(onSubmit)}
      body={bodyContent}
      footer={footerContent}
    />
  );
}
