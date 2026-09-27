"use client";

import useLoginModel from "@/hook/useLoginModal";
import useRegisterModal from "@/hook/useRegisterModal";
import axios from "axios";
import { useCallback, useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { AiFillGithub } from "react-icons/ai";
import { FcGoogle } from "react-icons/fc";
import { toast } from "react-toastify";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";

import Button from "../Button";
import Heading from "../Heading";
import Input from "../inputs/Input";
import Modal from "./Modal";
import Logo from "../navbar/Logo";

type Props = {};

function RegisterModal({}: Props) {
  const registerModel = useRegisterModal();
  const loginModel = useLoginModel();
  const t = useTranslations("modals.register");
  const tCommon = useTranslations("common");
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

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    setIsLoading(true);

    axios
      .post("/api/register", data)
      .then(() => {
        toast.success(t("success"));
        registerModel.onClose();
        loginModel.onOpen();
      })
      .catch((err: any) => toast.error(tCommon("error")))
      .finally(() => {
        setIsLoading(false);
      });
  };

  const toggle = useCallback(() => {
    registerModel.onClose();
    loginModel.onOpen();
  }, [loginModel, registerModel]);

  const bodyContent = (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center mb-1">
        <Logo variant="vertical" width={100} height={75} interactive={false} />
      </div>
      <Heading title={t("title")} subtitle={t("subtitle")} center />
      <Input
        id="name"
        label={t("name")}
        disabled={isLoading}
        register={register}
        errors={errors}
        required
      />
      <Input
        id="email"
        label={t("email")}
        disabled={isLoading}
        register={register}
        errors={errors}
        required
      />
      <Input
        id="password"
        type="password"
        label={t("password")}
        disabled={isLoading}
        register={register}
        errors={errors}
        required
      />
    </div>
  );

  const footerContent = (
    <div className="flex flex-col gap-4 mt-3">
      <hr />
      <Button
        outline
        label={t("continueGoogle")}
        icon={FcGoogle}
        onClick={() => signIn("google")}
      />
      <Button
        outline
        label={t("continueGithub")}
        icon={AiFillGithub}
        onClick={() => signIn("github")}
      />
      <div className="text-neutral-500 text-center mt-4 font-light text-sm">
        <div>
          {t("alreadyAccount")}{" "}
          <span
            onClick={toggle}
            className="text-neutral-800 font-semibold cursor-pointer hover:underline"
          >
            {t("logIn")}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      disabled={isLoading}
      isOpen={registerModel.isOpen}
      title={t("title")}
      actionLabel={t("continue")}
      onClose={registerModel.onClose}
      onSubmit={handleSubmit(onSubmit)}
      body={bodyContent}
      footer={footerContent}
    />
  );
}

export default RegisterModal;
