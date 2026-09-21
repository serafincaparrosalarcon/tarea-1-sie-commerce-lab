import { env } from "cloudflare:workers";

type EmailStatus = "sent" | "simulated" | "failed";
type OrderEmailInput = {
  to: string;
  customerName: string;
  orderNumber: string;
  status: string;
  total: number;
};

const statusContent: Record<string, { title: string; message: string; step: number }> = {
  CREADO: { title: "Hemos recibido tu pedido", message: "Tu pedido ya está registrado en Sensoria.", step: 1 },
  PAGO_SIMULADO: { title: "Pedido confirmado", message: "El pago de demostración se ha aceptado y empezaremos a preparar tu selección.", step: 1 },
  "PREPARACIÓN": { title: "Estamos preparando tu pedido", message: "Tu ritual sensorial está siendo preparado con cuidado.", step: 2 },
  ENVIADO: { title: "Tu pedido está en camino", message: "El envío simulado ya ha salido y pronto llegará a su destino.", step: 3 },
  ENTREGADO: { title: "Pedido entregado", message: "Tu pedido figura como entregado. Esperamos que disfrutes tu nuevo ritual.", step: 4 },
  CANCELADO: { title: "Pedido cancelado", message: "El pedido se ha marcado como cancelado en la demostración.", step: 0 },
};

const safe = (value: string) =>
  value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char);

export async function sendOrderEmail(input: OrderEmailInput): Promise<{ status: EmailStatus; providerId: string | null }> {
  const runtime = env as unknown as { RESEND_API_KEY?: string; RESEND_FROM?: string };
  const content = statusContent[input.status] ?? statusContent.CREADO;
  if (!runtime.RESEND_API_KEY) return { status: "simulated", providerId: null };

  const steps = ["Confirmado", "Preparando", "Enviado", "Entregado"]
    .map((label, index) => `<td style="width:25%;text-align:center;color:${index < content.step ? "#244a68" : "#9baab3"};font-size:12px"><div style="width:28px;height:28px;line-height:28px;border-radius:50%;margin:0 auto 8px;background:${index < content.step ? "#ffc36b" : "#e6ecef"};font-weight:800">${index + 1}</div>${label}</td>`)
    .join("");
  const html = `<!doctype html><html><body style="margin:0;background:#eef3f5;font-family:Arial,sans-serif;color:#102a3c"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:32px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:auto;background:#fff;border-radius:22px;overflow:hidden"><tr><td style="background:#102a3c;padding:28px 34px;color:#fff"><div style="font-size:24px;font-weight:900">SENSORIA</div><div style="color:#bcd0da;font-size:12px;margin-top:5px">Bienestar sensorial para adultos</div></td></tr><tr><td style="padding:38px 34px"><div style="display:inline-block;background:#fff2da;color:#244a68;border-radius:99px;padding:7px 12px;font-size:11px;font-weight:800">PEDIDO ${safe(input.orderNumber)}</div><h1 style="font-size:30px;line-height:1.15;margin:20px 0 12px">${content.title}</h1><p style="font-size:16px;line-height:1.6;color:#5e7380">Hola ${safe(input.customerName)}, ${content.message}</p><table role="presentation" width="100%" style="margin:30px 0"><tr>${steps}</tr></table><div style="background:#edf3f5;border-radius:14px;padding:18px"><span style="color:#71838e;font-size:12px">Total del pedido</span><strong style="float:right;font-size:20px">${input.total.toFixed(2).replace(".", ",")} €</strong></div><p style="margin:28px 0 0;color:#8a989f;font-size:11px;line-height:1.5">Este correo pertenece a un prototipo académico. No confirma una compra, un pago ni un envío real.</p></td></tr><tr><td style="background:#ffc36b;padding:18px 34px;font-size:12px;font-weight:700">Sensoria · Pequeñas pausas, mejor diseñadas.</td></tr></table></td></tr></table></body></html>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${runtime.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: runtime.RESEND_FROM ?? "Sensoria <onboarding@resend.dev>",
        to: [input.to],
        subject: `${content.title} · ${input.orderNumber}`,
        html,
      }),
    });
    if (!response.ok) return { status: "failed", providerId: null };
    const result = (await response.json()) as { id?: string };
    return { status: "sent", providerId: result.id ?? null };
  } catch {
    return { status: "failed", providerId: null };
  }
}
