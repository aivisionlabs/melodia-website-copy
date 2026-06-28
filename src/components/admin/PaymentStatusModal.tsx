"use client";

import { X, CheckCircle2, XCircle, Clock, CreditCard } from "lucide-react";

interface PaymentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: {
    id: number;
    status: string;
    amount: string | number;
    created_at: Date | string;
    payment_id?: string | null;
    order_id?: string | null;
  } | null;
}

export default function PaymentStatusModal({
  isOpen,
  onClose,
  payment,
}: PaymentStatusModalProps) {
  if (!isOpen) return null;

  const getStatusInfo = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return {
          label: "Success",
          color: "text-green-600",
          bgColor: "bg-green-50",
          icon: CheckCircle2,
        };
      case "failed":
        return {
          label: "Failed",
          color: "text-red-600",
          bgColor: "bg-red-50",
          icon: XCircle,
        };
      case "pending":
        return {
          label: "Pending",
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          icon: Clock,
        };
      default:
        return {
          label: status || "Unknown",
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          icon: CreditCard,
        };
    }
  };

  const formatDate = (date: Date | string) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount: string | number) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return `₹${numAmount.toFixed(2)}`;
  };

  if (!payment) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              Payment Status
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No payment record found</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(payment.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">
            Payment Status
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div
            className={`${statusInfo.bgColor} rounded-lg p-4 flex items-center gap-3`}
          >
            <StatusIcon className={`w-6 h-6 ${statusInfo.color}`} />
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className={`font-semibold ${statusInfo.color}`}>
                {statusInfo.label}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 mb-1">Payment ID</p>
              <p className="text-gray-900 font-medium">#{payment.id}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Amount</p>
              <p className="text-gray-900 font-medium text-lg">
                {formatAmount(payment.amount)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Date</p>
              <p className="text-gray-900 font-medium">
                {formatDate(payment.created_at)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Order ID</p>
              <p className="text-gray-900 font-medium font-mono text-xs break-all">
                {payment.order_id || null}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Payment Provider ID</p>
              <p className="text-gray-900 font-medium font-mono text-xs break-all">
                {payment.payment_id || null}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
