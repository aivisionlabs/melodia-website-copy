"use client";

import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

type Props = {
  newWebhookSecret: string | null;
  newApiKey: string | null;
  onCopy: (value: string, label: string) => void | Promise<void>;
};

export function SecretsBanners({
  newWebhookSecret,
  newApiKey,
  onCopy,
}: Props) {
  return (
    <>
      {newWebhookSecret && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                New webhook secret
              </p>
              <p className="text-xs text-amber-800">
                This secret is shown once. Save it in your partner
                configuration.
              </p>
              <code className="block mt-2 text-xs bg-white px-2 py-1 rounded border border-amber-200 break-all">
                {newWebhookSecret}
              </code>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                void onCopy(newWebhookSecret, "Webhook secret")
              }
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
        </div>
      )}

      {newApiKey && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-green-900">
                New partner API key
              </p>
              <p className="text-xs text-green-800">
                This key is shown once. Share it securely with the partner.
              </p>
              <code className="block mt-2 text-xs bg-white px-2 py-1 rounded border border-green-200 break-all">
                {newApiKey}
              </code>
            </div>
            <Button
              variant="outline"
              onClick={() => void onCopy(newApiKey, "API key")}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
