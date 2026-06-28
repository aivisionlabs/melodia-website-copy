const entity =
{
    id: 'pay_RhINryAdJLuFQe',
    entity: 'payment',
    amount: 29900,
    currency: 'INR',
    status: 'captured',
    order_id: 'order_RhINoJZrxuDIpR',
    invoice_id: null,
    international: false,
    method: 'netbanking',
    amount_refunded: 0,
    refund_status: null,
    captured: true,
    description: 'Personalized Song Generation',
    card_id: null,
    bank: 'BARB_R',
    wallet: null,
    vpa: null,
    email: 'void@razorpay.com',
    contact: '+918160348401',
    notes: { songRequestId: '32' },
    fee: 671,
    tax: 102,
    error_code: null,
    error_description: null,
    error_source: null,
    error_step: null,
    error_reason: null,
    acquirer_data: { bank_transaction_id: '3676024' },
    created_at: 1763489106,
    reward: null,
    base_amount: 29900
}




const payload = {
    entity: 'event',
    account_id: 'acc_RUQM85whboGTDW',
    event: 'payment.captured',
    contains: ['payment'
    ],
    payload: {
        payment: {
            entity: [Object]
        }
    },
    created_at: 1763489109
}

