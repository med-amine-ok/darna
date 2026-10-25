"use client";

import React, { useState } from "react";
import { Check, MessageSquare, XCircle, ShieldCheck } from "lucide-react";

export type ModerationDecision = "approve_publish" | "request_changes" | "reject";

export interface DecisionCardProps {
  onApprove: (notes?: string) => void;
  onRequestChanges: (reason: string) => void;
  onReject: (reason: string) => void;
  isLoading?: boolean;
  className?: string;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({
  onApprove,
  onRequestChanges,
  onReject,
  isLoading = false,
  className = "",
}) => {
  const [selectedDecision, setSelectedDecision] = useState<ModerationDecision>("approve_publish");
  const [dialogOpen, setDialogOpen] = useState<"changes" | "reject" | null>(null);
  const [reasonInput, setReasonInput] = useState("");

  const handleActionClick = () => {
    if (selectedDecision === "approve_publish") {
      onApprove();
    } else if (selectedDecision === "request_changes") {
      setDialogOpen("changes");
    } else if (selectedDecision === "reject") {
      setDialogOpen("reject");
    }
  };

  const handleConfirmModal = () => {
    if (dialogOpen === "changes") {
      onRequestChanges(reasonInput);
    } else if (dialogOpen === "reject") {
      onReject(reasonInput);
    }
    setDialogOpen(null);
    setReasonInput("");
  };

  return (
    <>
      <div
        className={`bg-white rounded-2xl border border-tertiary-200/80 shadow-darna-card p-4 space-y-4 ${className}`}
      >
        <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-100">
          <ShieldCheck className="w-4 h-4 text-secondary" />
          <h3 className="text-xs font-bold text-primary">Décision</h3>
        </div>

        {/* Radio Choices */}
        <div className="space-y-2.5">
          {/* Option 1: Approuver */}
          <label
            onClick={() => setSelectedDecision("approve_publish")}
            className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
              selectedDecision === "approve_publish"
                ? "border-secondary bg-secondary-50/40 ring-1 ring-secondary/30"
                : "border-neutral-200 hover:bg-neutral-50"
            }`}
          >
            <input
              type="radio"
              name="decision"
              checked={selectedDecision === "approve_publish"}
              onChange={() => setSelectedDecision("approve_publish")}
              className="mt-0.5 text-secondary focus:ring-secondary cursor-pointer"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-primary">Approuver et publier</span>
              <span className="text-[11px] text-neutral-500 mt-0.5 leading-tight">
                L'annonce sera immédiatement publiée sur la plateforme.
              </span>
            </div>
          </label>

          {/* Option 2: Demander des modifications */}
          <label
            onClick={() => setSelectedDecision("request_changes")}
            className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
              selectedDecision === "request_changes"
                ? "border-amber-400 bg-amber-50/40 ring-1 ring-amber-400/30"
                : "border-neutral-200 hover:bg-neutral-50"
            }`}
          >
            <input
              type="radio"
              name="decision"
              checked={selectedDecision === "request_changes"}
              onChange={() => setSelectedDecision("request_changes")}
              className="mt-0.5 text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-primary">Demander des modifications</span>
              <span className="text-[11px] text-neutral-500 mt-0.5 leading-tight">
                L'hôte devra apporter des modifications avant une nouvelle validation.
              </span>
            </div>
          </label>

          {/* Option 3: Refuser */}
          <label
            onClick={() => setSelectedDecision("reject")}
            className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
              selectedDecision === "reject"
                ? "border-accent bg-accent-50/40 ring-1 ring-accent/30"
                : "border-neutral-200 hover:bg-neutral-50"
            }`}
          >
            <input
              type="radio"
              name="decision"
              checked={selectedDecision === "reject"}
              onChange={() => setSelectedDecision("reject")}
              className="mt-0.5 text-accent focus:ring-accent cursor-pointer"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-primary">Refuser</span>
              <span className="text-[11px] text-neutral-500 mt-0.5 leading-tight">
                L'annonce sera refusée et l'hôte en sera informé.
              </span>
            </div>
          </label>
        </div>

        {/* 3 Action Buttons matching Mockup 04 & 06 */}
        <div className="space-y-2 pt-2 border-t border-neutral-100">
          <button
            type="button"
            onClick={() => onApprove()}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-secondary hover:bg-secondary-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Approuver et publier</span>
          </button>

          <button
            type="button"
            onClick={() => setDialogOpen("changes")}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl border border-tertiary-300 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition shadow-2xs cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-neutral-500" />
            <span>Demander des modifications</span>
          </button>

          <button
            type="button"
            onClick={() => setDialogOpen("reject")}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl border border-accent/40 text-accent hover:bg-accent/10 text-xs font-semibold transition cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Refuser</span>
          </button>
        </div>
      </div>

      {/* Reason Modal Dialog for Rejection or Request Changes */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-tertiary-200 max-w-md w-full p-4 sm:p-5 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-primary">
              {dialogOpen === "changes"
                ? "Demander des modifications à l'hôte"
                : "Motif du refus de l'annonce"}
            </h3>
            <p className="text-xs text-neutral-500">
              {dialogOpen === "changes"
                ? "Précisez les éléments manquants ou non conformes. Ce message sera transmis au prestataire."
                : "Indiquez la raison du refus. Une notification formelle sera envoyée au prestataire."}
            </p>

            <textarea
              rows={4}
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="Ex: Photos non conformes, titre de propriété manquant, descriptif incomplet..."
              className="w-full p-3 rounded-xl border border-tertiary-200 text-base sm:text-xs focus:outline-none focus:border-primary resize-none"
            />

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDialogOpen(null)}
                className="px-4 py-2.5 min-h-[44px] rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition justify-center"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmModal}
                disabled={!reasonInput.trim()}
                className={`px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition text-white justify-center ${
                  dialogOpen === "changes"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-accent hover:bg-accent-700"
                } ${!reasonInput.trim() ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {dialogOpen === "changes" ? "Envoyer la demande" : "Confirmer le refus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
