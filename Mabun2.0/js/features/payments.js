import { showModal } from '../utils/modal.js';
import { apiClient } from '../core/api.js';
import config from '../core/config.js';

// This file handles deposit and withdrawal flows
// It can be used by wallet.html or separate deposit/withdraw pages

export async function initiateDeposit(amount, provider) {
  try {
    const response = await apiClient('/wallet/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount, provider })
    });
    // response contains paymentUrl or transaction reference
    if (response.paymentUrl) {
      // Redirect to mobile money payment page
      window.location.href = response.paymentUrl;
    } else {
      // Fallback: show QR code or instructions
      await showModal({
        title: 'Deposit Instructions',
        message: `Please send ${amount} SSP to ${response.instructions}`,
        confirmText: 'I have sent'
      });
    }
  } catch (error) {
    await showModal({ title: 'Deposit Failed', message: error.message, confirmText: 'OK' });
  }
}

export async function initiateWithdrawal(amount) {
  try {
    const response = await apiClient('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount })
    });
    await showModal({
      title: 'Withdrawal Initiated',
      message: `You will receive ${amount - amount * config.WITHDRAWAL_FEE} SSP shortly.`,
      confirmText: 'OK'
    });
  } catch (error) {
    await showModal({ title: 'Withdrawal Failed', message: error.message, confirmText: 'OK' });
  }
}