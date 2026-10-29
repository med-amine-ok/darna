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

export default function RegisterModal() {
  const openLogin = useLoginModal((s) => s.onOpen);
  const isRegisterOpen = useRegisterModal((s) => s.isOpen);
  const closeRegister = useRegisterModal((s) => s.onClose);
  const t = useTranslations("modals.register");
  const errorText = useActionError();
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

      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(errorText(result, t("genericError")));
        return;
      }

      const userName = typeof result.user?.name === "string" ? result.user.name : data.name;
      toast.success(userName ? t("welcomeName", { name: userName }) : t("success"));
      closeRegister();
      window.location.reload();
    } catch {
      toast.error(t("genericError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthRegister = (provider: string) => {
    // Social sign-up is not available yet in the mock backend.
    toast.info(t("oauthComingSoon", { provider }));
  };

  const toggle = useCallback(() => {
    closeRegister();
    openLogin();
  }, [closeRegister, openLogin]);

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
        id="name"
        label={t("name")}
        autoComplete="name"
        disabled={isLoading}
        register={register}
        errors={errors}
        required
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
        autoComplete="new-password"
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
        onClick={() => handleOAuthRegister("Google")}
      />
      <Button
        outline
        label={t("continueGithub")}
        icon={BrandGithubIcon}
        onClick={() => handleOAuthRegister("GitHub")}
      />
      <div className="text-neutral-600 text-center mt-3 font-normal text-sm">
        <div>
          {t("alreadyAccount")}{" "}
          <button
            type="button"
            onClick={toggle}
            className="text-primary font-semibold cursor-pointer hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
          >
            {t("logIn")}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      disabled={isLoading}
      isOpen={isRegisterOpen}
      title={t("modalTitle")}
      actionLabel={t("continue")}
      onClose={closeRegister}
      onSubmit={handleSubmit(onSubmit)}
      body={bodyContent}
      footer={footerContent}
    />
  );
}
