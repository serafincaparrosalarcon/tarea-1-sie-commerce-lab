export async function sendTelegram({ token, chatId, text }) {
  if (!token || !chatId) {
    return { status: 'SIMULATED', provider_id: null, error: 'Telegram no configurado en este entorno academico' };
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
      signal: AbortSignal.timeout(10000)
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.description || `Telegram HTTP ${response.status}`);
    return { status: 'SENT', provider_id: String(data.result?.message_id || ''), error: null };
  } catch (error) {
    return { status: 'ERROR', provider_id: null, error: String(error.message || error).slice(0, 500) };
  }
}

export function telegramClientMessage(supportCase, proposal) {
  const safe = (value) => String(value || '').replace(/[<>]/g, '');
  return `<b>Sensoria · solicitud ${safe(supportCase.external_id)}</b>\n\n${safe(proposal.response_draft)}\n\n<i>Mensaje revisado y aprobado por una persona del equipo.</i>`;
}
