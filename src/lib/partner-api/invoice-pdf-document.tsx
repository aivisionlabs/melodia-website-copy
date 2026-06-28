import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import type { FlatUnitBreakdown } from '@/lib/partner-api/invoice-products';
import {
  INVOICE_BANK_DETAILS,
  INVOICE_CONTACT,
  INVOICE_FROM,
  INVOICE_GST_NOTE,
} from '@/lib/partner-api/invoice-company-info';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  logo: { width: 140, height: 'auto', objectFit: 'contain' },
  headerText: { flex: 1, marginLeft: 16, alignItems: 'flex-end' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  subtitle: { fontSize: 11, marginTop: 4, color: '#6b7280', textAlign: 'right' },
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 24,
  },
  addressBlock: { flex: 1 },
  addressLabel: { fontSize: 10, fontWeight: 'bold', marginBottom: 4, color: '#111827' },
  addressLine: { fontSize: 9, color: '#374151', marginBottom: 2, lineHeight: 1.35 },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', marginBottom: 6, color: '#111827' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  bankRow: { flexDirection: 'row', marginBottom: 3 },
  bankLabel: { width: '38%', fontSize: 9, color: '#6b7280' },
  bankValue: { flex: 1, fontSize: 9, color: '#374151' },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 4,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
  },
  colId: { width: '18%' },
  colRecipient: { width: '22%' },
  colDetail: { width: '35%' },
  colAmount: { width: '15%', textAlign: 'right' },
  totalRow: { marginTop: 12, fontSize: 12, fontWeight: 'bold', textAlign: 'right' },
  note: { marginTop: 16, fontSize: 9, color: '#555', lineHeight: 1.4 },
  footer: { marginTop: 12, fontSize: 9, color: '#374151', lineHeight: 1.4 },
});

export type InvoicePdfData = {
  logo_src: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  vendor_name: string;
  to_legal_entity_name: string | null;
  to_address: string | null;
  to_gst_number: string | null;
  to_mobile: string | null;
  product_type_label: string;
  period_start: string;
  period_end: string;
  currency: string;
  subtotal: string;
  billable_quantity: number;
  notes: string | null;
  pricing_model: 'flat_unit';
  unit_price?: string;
  line_items: Array<{
    external_order_id: string;
    recipient_name: string | null;
    completed_at: string | null;
    line_amount: string;
    pricing_breakdown: FlatUnitBreakdown;
  }>;
};

function AddressBlock({
  label,
  lines,
}: {
  label: string;
  lines: string[];
}) {
  return (
    <View style={styles.addressBlock}>
      <Text style={styles.addressLabel}>{label}</Text>
      {lines.map((line, idx) => (
        <Text key={idx} style={styles.addressLine}>
          {line}
        </Text>
      ))}
    </View>
  );
}

export function PartnerInvoicePdfDocument({ data }: { data: InvoicePdfData }) {
  const periodLabel = `${data.period_start.slice(0, 10)} – ${data.period_end.slice(0, 10)}`;
  const toLines = [
    data.to_legal_entity_name?.trim() || data.vendor_name,
    ...(data.to_address?.trim() ? data.to_address.split('\n').filter(Boolean) : []),
    ...(data.to_gst_number?.trim() ? [`GSTIN: ${data.to_gst_number.trim()}`] : []),
    ...(data.to_mobile?.trim() ? [`Mobile: ${data.to_mobile.trim()}`] : []),
  ];
  const contactLine = INVOICE_CONTACT.contacts
    .map((contact) => `${contact.name} (${contact.phone})`)
    .join(' & ');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={data.logo_src} style={styles.logo} />
          <View style={styles.headerText}>
            <Text style={styles.title}>Partner Invoice</Text>
            <Text style={styles.subtitle}>{data.invoice_number}</Text>
          </View>
        </View>

        <View style={styles.addressRow}>
          <AddressBlock label="From" lines={[...INVOICE_FROM.lines]} />
          <AddressBlock label="To" lines={toLines} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bank Account Details</Text>
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Account Holder&apos;s Name</Text>
            <Text style={styles.bankValue}>{INVOICE_BANK_DETAILS.account_holder_name}</Text>
          </View>
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Account Number</Text>
            <Text style={styles.bankValue}>{INVOICE_BANK_DETAILS.account_number}</Text>
          </View>
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Bank Name</Text>
            <Text style={styles.bankValue}>{INVOICE_BANK_DETAILS.bank_name}</Text>
          </View>
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Bank Branch</Text>
            <Text style={styles.bankValue}>{INVOICE_BANK_DETAILS.bank_branch}</Text>
          </View>
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>IFSC</Text>
            <Text style={styles.bankValue}>{INVOICE_BANK_DETAILS.ifsc}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text>Invoice date</Text>
            <Text>{data.invoice_date}</Text>
          </View>
          <View style={styles.row}>
            <Text>Due date</Text>
            <Text>{data.due_date}</Text>
          </View>
          <View style={styles.row}>
            <Text>Vendor</Text>
            <Text>{data.vendor_name}</Text>
          </View>
          <View style={styles.row}>
            <Text>Product</Text>
            <Text>{data.product_type_label}</Text>
          </View>
          <View style={styles.row}>
            <Text>Billing period</Text>
            <Text>{periodLabel}</Text>
          </View>
          {data.pricing_model === 'flat_unit' && data.unit_price ? (
            <View style={styles.row}>
              <Text>Per-song rate</Text>
              <Text>
                {data.currency} {data.unit_price}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colId}>Order ID</Text>
          <Text style={styles.colRecipient}>Recipient</Text>
          <Text style={styles.colDetail}>Details</Text>
          <Text style={styles.colAmount}>Amount</Text>
        </View>

        {data.line_items.map((line, idx) => (
          <View key={idx} style={styles.tableRow}>
            <Text style={styles.colId}>{line.external_order_id}</Text>
            <Text style={styles.colRecipient}>{line.recipient_name ?? '—'}</Text>
            <View style={styles.colDetail}>
              <Text>{`Unit ${line.pricing_breakdown.unit_price}`}</Text>
            </View>
            <Text style={styles.colAmount}>
              {data.currency} {line.line_amount}
            </Text>
          </View>
        ))}

        <Text style={styles.totalRow}>
          Total ({data.billable_quantity} items): {data.currency} {data.subtotal}
        </Text>

        {data.notes ? <Text style={styles.note}>Notes: {data.notes}</Text> : null}

        <Text style={styles.note}>{INVOICE_GST_NOTE}</Text>

        <Text style={styles.footer}>
          Contact - {contactLine}
          {'\n'}
          Website: {INVOICE_CONTACT.website}
        </Text>
      </Page>
    </Document>
  );
}
