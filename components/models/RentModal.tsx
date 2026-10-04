"use client";

import useRentModal from "@/hook/useRentModal";
import axios from "axios";
import dynamic from "next/dynamic";
import { useRouter } from "@/navigation";
import { useMemo, useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useTranslations } from "next-intl";

import Heading from "../Heading";
import CategoryInput from "../inputs/CategoryInput";
import Counter from "../inputs/Counter";
import CountrySelect from "../inputs/CountrySelect";
import ImageUpload from "../inputs/ImageUpload";
import Input from "../inputs/Input";
import { categories } from "../navbar/Categories";
import Modal from "./Modal";
import { useCurrency } from "@/hook/useCurrency";

type Props = {};

enum STEPS {
  CATEGORY = 0,
  LOCATION = 1,
  INFO = 2,
  IMAGES = 3,
  DESCRIPTION = 4,
  PRICE = 5,
}

const Map = dynamic(() => import("../Map"), {
  ssr: false,
});

function RentModal({}: Props) {
  const router = useRouter();
  const rentModel = useRentModal();
  const t = useTranslations("modals.rent");
  const tCommon = useTranslations("common");
  const tCat = useTranslations("categories");
  const [step, setStep] = useState(STEPS.CATEGORY);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<FieldValues>({
    defaultValues: {
      category: "",
      location: null,
      guestCount: 1,
      roomCount: 1,
      bathroomCount: 1,
      imageSrc: "",
      price: 15000,
      title: "",
      description: "",
    },
  });

  const { rate, formatEur, convertToEur } = useCurrency();
  const category = watch("category");
  const location = watch("location");
  const guestCount = watch("guestCount");
  const roomCount = watch("roomCount");
  const bathroomCount = watch("bathroomCount");
  const imageSrc = watch("imageSrc");
  const price = watch("price");

  const setCustomValue = (id: string, value: any) => {
    setValue(id, value, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const onBack = () => {
    setStep((value) => value - 1);
  };

  const onNext = () => {
    setStep((value) => value + 1);
  };

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    if (step !== STEPS.PRICE) {
      return onNext();
    }

    setIsLoading(true);

    axios
      .post("/api/listings", data)
      .then(() => {
        toast.success(tCommon("success"));
        router.refresh();
        reset();
        setStep(STEPS.CATEGORY);
        rentModel.onClose();
      })
      .catch(() => {
        toast.error(tCommon("error"));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const actionLabel = useMemo(() => {
    if (step === STEPS.PRICE) {
      return t("actionCreate");
    }

    return t("actionNext");
  }, [step, t]);

  const secondActionLabel = useMemo(() => {
    if (step === STEPS.CATEGORY) {
      return undefined;
    }

    return t("actionBack");
  }, [step, t]);

  let bodyContent = (
    <div className="flex flex-col gap-8">
      <Heading
        title={t("stepCategoryTitle")}
        subtitle={t("stepCategorySubtitle")}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto scrollbar-thin scrollbar-thumb-accent">
        {categories.map((item, index) => {
          let labelText = item.label;
          try {
            labelText = tCat(item.label as any);
          } catch {
            labelText = item.label;
          }
          return (
            <div key={index} className="col-span-1">
              <CategoryInput
                onClick={(category) => setCustomValue("category", category)}
                selected={category === item.label}
                label={labelText}
                icon={item.icon}
              />
            </div>
          );
        })}
      </div>
    </div>
  );

  if (step === STEPS.LOCATION) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title={t("stepLocationTitle")}
          subtitle={t("stepLocationSubtitle")}
        />
        <CountrySelect
          value={location}
          onChange={(value) => setCustomValue("location", value)}
        />
        <Map center={location?.latlng} />
      </div>
    );
  }

  if (step === STEPS.INFO) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title={t("stepInfoTitle")}
          subtitle={t("stepInfoSubtitle")}
        />
        <Counter
          title={t("guests")}
          subtitle={t("guestsSubtitle")}
          value={guestCount}
          onChange={(value) => setCustomValue("guestCount", value)}
        />
        <hr />
        <Counter
          title={t("rooms")}
          subtitle={t("roomsSubtitle")}
          value={roomCount}
          onChange={(value) => setCustomValue("roomCount", value)}
        />
        <hr />
        <Counter
          title={t("bathrooms")}
          subtitle={t("bathroomsSubtitle")}
          value={bathroomCount}
          onChange={(value) => setCustomValue("bathroomCount", value)}
        />
      </div>
    );
  }

  if (step === STEPS.IMAGES) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title={t("stepImageTitle")}
          subtitle={t("stepImageSubtitle")}
        />
        <ImageUpload
          onChange={(value) => setCustomValue("imageSrc", value)}
          value={imageSrc}
        />
      </div>
    );
  }

  if (step === STEPS.DESCRIPTION) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title={t("stepDescriptionTitle")}
          subtitle={t("stepDescriptionSubtitle")}
        />
        <Input
          id="title"
          label={t("inputTitle")}
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
        <hr />
        <Input
          id="description"
          label={t("inputDescription")}
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
      </div>
    );
  }

  if (step === STEPS.PRICE) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title={t("stepPriceTitle")}
          subtitle={t("stepPriceSubtitle")}
        />
        <Input
          id="price"
          label={t("inputPrice")}
          formatPrice
          type="number"
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
        {price > 0 && (
          <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-sm">
            <span className="text-neutral-600 font-medium">Estimated in Euros:</span>
            <span className="font-bold text-neutral-900">
              {formatEur(convertToEur(price))} <span className="text-xs text-neutral-400 font-normal">(1 EUR = {rate} DZD)</span>
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <Modal
      disabled={isLoading}
      isOpen={rentModel.isOpen}
      title={t("title")}
      actionLabel={actionLabel}
      onSubmit={handleSubmit(onSubmit)}
      secondaryActionLabel={secondActionLabel}
      secondaryAction={step === STEPS.CATEGORY ? undefined : onBack}
      onClose={rentModel.onClose}
      body={bodyContent}
    />
  );
}

export default RentModal;
