/** Static Melodia / AI Vision Labs details shown on all partner invoice PDFs. */
export const INVOICE_FROM = {
  lines: [
    'AIVisionLabs (proprietor- Karishma Jain)',
    'C3-302, SNN Raj Greenbay',
    'Electronic city, phase -II,',
    'Bangalore - 560100',
  ],
} as const;

export const INVOICE_BANK_DETAILS = {
  account_holder_name: 'Karishma Jain',
  account_number: '50100114654377',
  bank_name: 'HDFC Bank',
  bank_branch: 'Bangalore - I.T. Park',
  ifsc: 'HDFC0000077',
} as const;

export const INVOICE_GST_NOTE =
  'AIVisionLabs is a exempt from GST registration under section 23(1)(a) of the Central Goods and Services Tax (CGST) Act, 2017.';

export const INVOICE_CONTACT = {
  contacts: [
    { name: 'Saurabh Pareek', phone: '9008638618' },
    { name: 'Minkesh Jain', phone: '8880522285' },
  ],
  website: 'www.melodia-songs.com',
} as const;
