import { describe, expect, it } from "vitest";
import {
  nextPartnerInvoiceNumber,
  partnerInvoiceNumberPrefix,
} from "@/lib/partner-api/invoicing";

describe("partnerInvoiceNumberPrefix", () => {
  it("uses period_start year and month with uppercased slug", () => {
    const periodStart = new Date(2026, 5, 1); // June 2026 local
    expect(partnerInvoiceNumberPrefix("mytel", periodStart)).toBe("MLD-2026-06-MYTEL-");
  });

  it("sanitizes slug characters", () => {
    const periodStart = new Date(2026, 0, 15);
    expect(partnerInvoiceNumberPrefix("acme_corp!", periodStart)).toBe("MLD-2026-01-ACMECORP-");
  });
});

describe("nextPartnerInvoiceNumber", () => {
  const prefix = "MLD-2026-06-MYTEL-";

  it("starts at 00001 when no prior invoices", () => {
    expect(nextPartnerInvoiceNumber([], prefix)).toBe("MLD-2026-06-MYTEL-00001");
  });

  it("increments within the same prefix only", () => {
    const existing = [
      "MLD-2026-06-MYTEL-00003",
      "MLD-2026-06-MYTEL-00001",
      "MLD-2026-05-MYTEL-00099",
      "MLD-2026-06-OTHER-00010",
    ];
    expect(nextPartnerInvoiceNumber(existing, prefix)).toBe("MLD-2026-06-MYTEL-00004");
  });

  it("ignores legacy yearly-only numbers", () => {
    expect(
      nextPartnerInvoiceNumber(["MLD-2026-00042"], prefix),
    ).toBe("MLD-2026-06-MYTEL-00001");
  });
});
