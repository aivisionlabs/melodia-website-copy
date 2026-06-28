"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, KeyRound, Trash2 } from "lucide-react";

import type { PartnerApiCredential } from "./types";

type Props = {
  open: boolean;
  onToggleOpen: () => void;
  credentialName: string;
  setCredentialName: Dispatch<SetStateAction<string>>;
  credentialExpiry: string;
  setCredentialExpiry: Dispatch<SetStateAction<string>>;
  onGenerateCredential: () => void;
  creatingCredential: boolean;
  credentialsLoading: boolean;
  credentials: PartnerApiCredential[];
  deactivatingCredentialId: number | null;
  onDeactivateCredential: (credentialId: number) => void;
};

export function ApiKeysSection({
  open,
  onToggleOpen,
  credentialName,
  setCredentialName,
  credentialExpiry,
  setCredentialExpiry,
  onGenerateCredential,
  creatingCredential,
  credentialsLoading,
  credentials,
  deactivatingCredentialId,
  onDeactivateCredential,
}: Props) {
  return (
    <div className="bg-white border rounded-lg">
      <button
        type="button"
        onClick={onToggleOpen}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="text-left">
          <h2 className="font-semibold text-gray-900">Partner API Keys</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Keys are hashed in DB; raw value is shown once.
          </p>
        </div>
        {open ? (
          <ChevronUp className="h-5 w-5 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input
              value={credentialName}
              onChange={(event) => setCredentialName(event.target.value)}
              placeholder="Credential name (e.g. Production key)"
            />
            <Input
              type="datetime-local"
              value={credentialExpiry}
              onChange={(event) => setCredentialExpiry(event.target.value)}
            />
            <Button onClick={onGenerateCredential} disabled={creatingCredential}>
              <KeyRound className="h-4 w-4 mr-2" />
              {creatingCredential ? "Generating..." : "Generate Key"}
            </Button>
          </div>

          {credentialsLoading ? (
            <p className="text-sm text-gray-500">Loading keys...</p>
          ) : credentials.length === 0 ? (
            <p className="text-sm text-gray-500">No keys generated yet.</p>
          ) : (
            <div className="space-y-2">
              {credentials.map((credential) => (
                <div
                  key={credential.id}
                  className="border rounded p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {credential.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      Prefix: <code>{credential.key_prefix}...</code>
                    </p>
                    <p className="text-xs text-gray-500">
                      Last used:{" "}
                      {credential.last_used_at
                        ? new Date(credential.last_used_at).toLocaleString()
                        : "Never"}
                    </p>
                    <p className="text-xs text-gray-500">
                      Expires:{" "}
                      {credential.expires_at
                        ? new Date(credential.expires_at).toLocaleString()
                        : "No expiry"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        credential.active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {credential.active ? "Active" : "Inactive"}
                    </span>
                    {credential.active && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          deactivatingCredentialId === credential.id
                        }
                        onClick={() => onDeactivateCredential(credential.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Deactivate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
