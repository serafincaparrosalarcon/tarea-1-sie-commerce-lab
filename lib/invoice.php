<?php

declare(strict_types=1);

function invoice_money(float $amount): string {
    return number_format($amount, 2, ',', '.') . ' &euro;';
}

function invoice_escape(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function invoice_html(array $order, bool $fullDocument = false): string {
    $items = is_array($order['items'] ?? null) ? $order['items'] : [];
    $rows = '';
    foreach ($items as $item) {
        $quantity = max(1, (int)($item['quantity'] ?? 1));
        $unit = (float)($item['unit_price'] ?? 0);
        $rows .= '<tr><td>' . invoice_escape((string)($item['product_name'] ?? 'Producto')) . '</td>'
            . '<td style="text-align:center">' . $quantity . '</td>'
            . '<td style="text-align:right">' . invoice_money($unit) . '</td>'
            . '<td style="text-align:right"><b>' . invoice_money($unit * $quantity) . '</b></td></tr>';
    }
    if ($rows === '') {
        $rows = '<tr><td colspan="4">Detalle no disponible</td></tr>';
    }

    $date = (string)($order['created_at'] ?? date('Y-m-d H:i:s'));
    $address = trim((string)($order['address'] ?? ''));
    $cityLine = trim((string)($order['postal_code'] ?? '') . ' ' . (string)($order['city'] ?? ''));
    $content = '<section class="invoice">'
        . '<div class="invoice-warning">FACTURA DEMOSTRATIVA · PROTOTIPO ACADÉMICO · SIN VALIDEZ FISCAL</div>'
        . '<header><div><strong>SENSORIA</strong><span>Bienestar sensorial</span></div><div><b>Factura</b><span>' . invoice_escape((string)$order['order_number']) . '</span></div></header>'
        . '<div class="invoice-parties"><div><small>EMISOR FICTICIO</small><b>Sensoria · Proyecto académico</b><span>Calle de la Innovación, 24</span><span>28014 Madrid · España</span><span>pedidos@sensoria.onl</span></div>'
        . '<div><small>CLIENTE</small><b>' . invoice_escape((string)($order['customer_name'] ?? '')) . '</b><span>' . invoice_escape((string)($order['customer_email'] ?? '')) . '</span><span>' . invoice_escape($address) . '</span><span>' . invoice_escape($cityLine) . '</span></div></div>'
        . '<div class="invoice-meta"><span><small>Fecha</small><b>' . invoice_escape($date) . '</b></span><span><small>Pago</small><b>PayPal simulado</b></span><span><small>Estado</small><b>' . invoice_escape((string)($order['status'] ?? 'PAGO_SIMULADO')) . '</b></span></div>'
        . '<table><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Importe</th></tr></thead><tbody>' . $rows . '</tbody></table>'
        . '<div class="invoice-totals"><span>Subtotal<b>' . invoice_money((float)($order['subtotal'] ?? 0)) . '</b></span><span>Descuento<b>−' . invoice_money((float)($order['discount'] ?? 0)) . '</b></span><span>Envío<b>' . invoice_money((float)($order['shipping'] ?? 0)) . '</b></span><span>IVA (21 %)<b>' . invoice_money((float)($order['tax'] ?? 0)) . '</b></span><span class="grand">Total<b>' . invoice_money((float)($order['total'] ?? 0)) . '</b></span></div>'
        . '<p class="invoice-note">No se ha producido ningún cobro ni envío real. Documento generado exclusivamente como evidencia funcional del prototipo académico Sensoria.</p>'
        . '</section>';

    if (!$fullDocument) return $content;

    return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Factura ' . invoice_escape((string)$order['order_number']) . '</title>'
        . '<style>body{margin:0;background:#eef3f5;color:#102a3c;font:15px Arial,sans-serif}.toolbar{max-width:900px;margin:20px auto;text-align:right}.toolbar button{border:0;border-radius:9px;background:#244a68;color:#fff;padding:11px 16px;font-weight:700;cursor:pointer}.invoice{max-width:820px;margin:0 auto 32px;background:#fff;padding:34px;box-shadow:0 16px 45px #102a3c20}.invoice-warning{background:#fff3df;border:1px solid #f0c983;padding:10px;text-align:center;font-size:11px;font-weight:bold;letter-spacing:.08em}.invoice header{display:flex;justify-content:space-between;gap:25px;padding:28px 0;border-bottom:2px solid #102a3c}.invoice header div{display:flex;flex-direction:column}.invoice header strong{font-size:28px;letter-spacing:.12em}.invoice header b{font-size:22px}.invoice-parties{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin:28px 0}.invoice-parties div{display:flex;flex-direction:column;gap:4px}.invoice small{color:#617481;font-weight:bold}.invoice-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0}.invoice-meta span{display:flex;flex-direction:column;padding:12px;background:#edf3f5}.invoice table{width:100%;border-collapse:collapse}.invoice th,.invoice td{padding:12px 8px;border-bottom:1px solid #dce5ea;text-align:left}.invoice th{background:#102a3c;color:#fff}.invoice-totals{width:min(360px,100%);margin:24px 0 20px auto}.invoice-totals span{display:flex;justify-content:space-between;padding:7px}.invoice-totals .grand{border-top:2px solid #102a3c;font-size:20px}.invoice-note{color:#617481;font-size:12px;line-height:1.6}@media(max-width:600px){.invoice{padding:18px}.invoice-parties,.invoice-meta{grid-template-columns:1fr}.invoice table{font-size:12px}}@media print{body{background:#fff}.toolbar{display:none}.invoice{box-shadow:none;margin:0;max-width:none}}</style></head><body><div class="toolbar"><button onclick="window.print()">Imprimir / guardar como PDF</button></div>' . $content . '</body></html>';
}

function invoice_pdf(array $order): string {
    $toPdfText = static function (string $text): string {
        $encoded = function_exists('iconv') ? iconv('UTF-8', 'Windows-1252//TRANSLIT//IGNORE', $text) : $text;
        $encoded = $encoded === false ? $text : $encoded;
        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $encoded);
    };

    $lines = [
        ['SENSORIA', true, 20],
        ['FACTURA DEMOSTRATIVA - SIN VALIDEZ FISCAL', true, 11],
        ['Pedido: ' . (string)$order['order_number'], false, 10],
        ['Fecha: ' . (string)($order['created_at'] ?? date('Y-m-d H:i:s')), false, 10],
        ['', false, 8],
        ['Cliente: ' . (string)($order['customer_name'] ?? ''), true, 11],
        ['Email: ' . (string)($order['customer_email'] ?? ''), false, 10],
        ['Direccion: ' . (string)($order['address'] ?? ''), false, 10],
        ['Localidad: ' . trim((string)($order['postal_code'] ?? '') . ' ' . (string)($order['city'] ?? '')), false, 10],
        ['', false, 8],
        ['DETALLE DEL PEDIDO', true, 11],
    ];
    foreach (($order['items'] ?? []) as $item) {
        $qty = max(1, (int)($item['quantity'] ?? 1));
        $unit = (float)($item['unit_price'] ?? 0);
        $lines[] = [sprintf('%dx %s - %.2f EUR', $qty, (string)($item['product_name'] ?? 'Producto'), $qty * $unit), false, 9];
    }
    array_push($lines,
        ['', false, 8],
        [sprintf('Subtotal: %.2f EUR', (float)($order['subtotal'] ?? 0)), false, 10],
        [sprintf('Descuento: -%.2f EUR', (float)($order['discount'] ?? 0)), false, 10],
        [sprintf('Envio: %.2f EUR', (float)($order['shipping'] ?? 0)), false, 10],
        [sprintf('IVA (21%%): %.2f EUR', (float)($order['tax'] ?? 0)), false, 10],
        [sprintf('TOTAL: %.2f EUR', (float)($order['total'] ?? 0)), true, 14],
        ['', false, 8],
        ['Pago PayPal simulado. No se ha realizado ningun cobro real.', false, 9],
        ['Emisor ficticio: Sensoria - Proyecto academico, Madrid, Espana.', false, 9]
    );

    $commands = [];
    $y = 800;
    foreach ($lines as [$line, $bold, $size]) {
        $font = $bold ? 'F2' : 'F1';
        $commands[] = 'BT /' . $font . ' ' . $size . ' Tf 50 ' . $y . ' Td (' . $toPdfText((string)$line) . ') Tj ET';
        $y -= max(14, $size + 5);
    }
    $stream = implode("\n", $commands);
    $objects = [
        1 => '<< /Type /Catalog /Pages 2 0 R >>',
        2 => '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        3 => '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
        4 => '<< /Length ' . strlen($stream) . ">>\nstream\n" . $stream . "\nendstream",
        5 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
        6 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    ];
    $pdf = "%PDF-1.4\n";
    $offsets = [0];
    foreach ($objects as $number => $object) {
        $offsets[$number] = strlen($pdf);
        $pdf .= $number . " 0 obj\n" . $object . "\nendobj\n";
    }
    $xref = strlen($pdf);
    $pdf .= "xref\n0 7\n0000000000 65535 f \n";
    for ($i = 1; $i <= 6; $i++) {
        $pdf .= sprintf("%010d 00000 n \n", $offsets[$i]);
    }
    return $pdf . "trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n" . $xref . "\n%%EOF";
}
