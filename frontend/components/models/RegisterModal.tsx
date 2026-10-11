"use client";

import React, { useCallback, useState } from "react";
import { useLoginModal } from "@/hook/useLoginModal";
import { useRegisterModal } from "@/hook/useRegisterModal";
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
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Account created successfully! Please log in.");
      registerModal.onClose();
      loginModal.onOpen();
    }, 600);
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
        icon={FcGoogle}
        onClick={() => {
          toast.info("Google OAuth provider connected");
          registerModal.onClose();
        }}
      />
      <Button
        outline
        label="Continue with GitHub"
        icon={AiFillGithub}
        onClick={() => {
          toast.info("GitHub OAuth provider connected");
          registerModal.onClose();
        }}
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
