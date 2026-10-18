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
        . '<header class="invoice-header"><div class="invoice-brand"><span class="invoice-mark">≋</span><div><strong>SENSORIA</strong><span>Bienestar sensorial</span></div></div><div class="invoice-title"><small>DOCUMENTO DE COMPRA</small><b>Factura demostrativa</b><span>' . invoice_escape((string)$order['order_number']) . '</span></div></header>'
        . '<div class="invoice-warning"><b>PROTOTIPO ACADÉMICO</b><span>Documento demostrativo sin validez fiscal. No se ha realizado ningún cobro real.</span></div>'
        . '<div class="invoice-parties"><div><small>EMISOR FICTICIO</small><b>Sensoria · Proyecto académico</b><span>Calle de la Innovación, 24</span><span>28014 Madrid · España</span><span>pedidos@sensoria.onl</span></div>'
        . '<div><small>CLIENTE</small><b>' . invoice_escape((string)($order['customer_name'] ?? '')) . '</b><span>' . invoice_escape((string)($order['customer_email'] ?? '')) . '</span><span>' . invoice_escape($address) . '</span><span>' . invoice_escape($cityLine) . '</span></div></div>'
        . '<div class="invoice-meta"><span><small>Fecha</small><b>' . invoice_escape($date) . '</b></span><span><small>Pago</small><b>PayPal simulado</b></span><span><small>Estado</small><b>' . invoice_escape((string)($order['status'] ?? 'PAGO_SIMULADO')) . '</b></span></div>'
        . '<table><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Importe</th></tr></thead><tbody>' . $rows . '</tbody></table>'
        . '<div class="invoice-totals"><span>Subtotal<b>' . invoice_money((float)($order['subtotal'] ?? 0)) . '</b></span><span>Descuento<b>−' . invoice_money((float)($order['discount'] ?? 0)) . '</b></span><span>Envío<b>' . invoice_money((float)($order['shipping'] ?? 0)) . '</b></span><span>IVA (21 %)<b>' . invoice_money((float)($order['tax'] ?? 0)) . '</b></span><span class="grand">Total<b>' . invoice_money((float)($order['total'] ?? 0)) . '</b></span></div>'
        . '<footer class="invoice-footer"><div><b>Gracias por elegir Sensoria</b><span>Tu pausa empieza aquí.</span></div><p>Documento generado exclusivamente como evidencia funcional del prototipo académico Sensoria.</p></footer>'
        . '</section>';

    if (!$fullDocument) return $content;

    return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Factura ' . invoice_escape((string)$order['order_number']) . '</title>'
        . '<style>*{box-sizing:border-box}body{margin:0;background:#eaf1f2;color:#102a3c;font:15px Arial,sans-serif}.toolbar{max-width:900px;margin:20px auto;text-align:right}.toolbar button{border:0;border-radius:12px;background:#173f55;color:#fff;padding:12px 18px;font-weight:700;cursor:pointer;box-shadow:0 8px 18px #102a3c25}.invoice{max-width:820px;margin:0 auto 32px;background:#fff;padding:0 38px 34px;box-shadow:0 18px 50px #102a3c20;border-radius:20px;overflow:hidden}.invoice-header{margin:0 -38px;display:flex;justify-content:space-between;align-items:center;gap:25px;padding:30px 38px;background:linear-gradient(135deg,#102a3c,#245f6b);color:#fff}.invoice-brand{display:flex;align-items:center;gap:14px}.invoice-mark{display:grid;place-items:center;width:48px;height:48px;border-radius:15px;background:#e3b87a;color:#102a3c;font-size:28px;font-weight:bold}.invoice-brand>div,.invoice-title{display:flex;flex-direction:column}.invoice-header strong{font-size:24px;letter-spacing:.14em}.invoice-header span{color:#d8e7e9}.invoice-title{text-align:right}.invoice-title small{color:#c0d7dc;letter-spacing:.12em}.invoice-title b{font-size:23px;margin:4px 0}.invoice-warning{display:flex;align-items:center;gap:16px;margin:24px 0;padding:13px 16px;border-radius:12px;background:#fff5e7;border:1px solid #efd2a8}.invoice-warning b{color:#9a5e16;font-size:11px;letter-spacing:.08em;white-space:nowrap}.invoice-warning span{color:#684c2d;font-size:12px}.invoice-parties{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:24px 0}.invoice-parties>div{display:flex;flex-direction:column;gap:5px;padding:18px;border-radius:14px;background:#f4f8f8;border:1px solid #dce8e9}.invoice small{color:#47707b;font-weight:bold;letter-spacing:.06em}.invoice-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0}.invoice-meta>span{display:flex;flex-direction:column;gap:5px;padding:13px 14px;border-radius:12px;background:#eaf3f3}.invoice table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden;border-radius:14px;border:1px solid #d8e4e6}.invoice th,.invoice td{padding:13px 11px;border-bottom:1px solid #dce5ea;text-align:left}.invoice th{background:#173f55;color:#fff;font-size:12px;letter-spacing:.04em}.invoice tbody tr:nth-child(even){background:#f7fafb}.invoice tbody tr:last-child td{border-bottom:0}.invoice-totals{width:min(370px,100%);margin:24px 0 24px auto;padding:14px 16px;border-radius:14px;background:#f4f8f8}.invoice-totals>span{display:flex;justify-content:space-between;padding:7px}.invoice-totals .grand{margin-top:6px;padding-top:13px;border-top:2px solid #2a6f78;color:#173f55;font-size:21px}.invoice-footer{display:flex;justify-content:space-between;gap:24px;align-items:end;margin-top:30px;padding-top:20px;border-top:1px solid #d8e4e6}.invoice-footer>div{display:flex;flex-direction:column;color:#2a6f78}.invoice-footer p{max-width:420px;margin:0;color:#6b7f88;font-size:11px;line-height:1.5;text-align:right}@media(max-width:600px){.invoice{padding:0 18px 24px;border-radius:0}.invoice-header{margin:0 -18px;padding:24px 18px;align-items:flex-start}.invoice-title b{font-size:18px}.invoice-parties,.invoice-meta{grid-template-columns:1fr}.invoice-warning,.invoice-footer{align-items:flex-start;flex-direction:column}.invoice-footer p{text-align:left}.invoice table{font-size:12px}.invoice-mark{display:none}}@media print{body{background:#fff}.toolbar{display:none}.invoice{box-shadow:none;margin:0;max-width:none;border-radius:0}}</style></head><body><div class="toolbar"><button onclick="window.print()">Imprimir / guardar como PDF</button></div>' . $content . '</body></html>';
}

function invoice_pdf(array $order): string {
    $encode = static function (string $text): string {
        $encoded = function_exists('iconv') ? iconv('UTF-8', 'Windows-1252//TRANSLIT//IGNORE', $text) : $text;
        $encoded = $encoded === false ? $text : $encoded;
        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $encoded);
    };
    $money = static fn(float $amount): string => number_format($amount, 2, ',', '.') . ' EUR';
    $dateRaw = (string)($order['created_at'] ?? date('Y-m-d H:i:s'));
    try {
        $date = (new DateTime($dateRaw))->format('d/m/Y · H:i');
    } catch (Throwable) {
        $date = $dateRaw;
    }

    $commands = [];
    $fill = static function (array &$c, float $r, float $g, float $b): void {
        $c[] = sprintf('%.3F %.3F %.3F rg', $r, $g, $b);
    };
    $stroke = static function (array &$c, float $r, float $g, float $b): void {
        $c[] = sprintf('%.3F %.3F %.3F RG', $r, $g, $b);
    };
    $rect = static function (array &$c, float $x, float $y, float $w, float $h, bool $drawStroke = false): void {
        $c[] = sprintf('%.2F %.2F %.2F %.2F re %s', $x, $y, $w, $h, $drawStroke ? 'B' : 'f');
    };
    $text = static function (array &$c, string $value, float $x, float $y, float $size = 10, bool $bold = false, array $color = [0.063, 0.165, 0.235]) use ($encode): void {
        $c[] = sprintf('%.3F %.3F %.3F rg', $color[0], $color[1], $color[2]);
        $c[] = sprintf('BT /%s %.2F Tf 1 0 0 1 %.2F %.2F Tm (%s) Tj ET', $bold ? 'F2' : 'F1', $size, $x, $y, $encode($value));
    };
    $rightText = static function (array &$c, string $value, float $right, float $y, float $size = 10, bool $bold = false, array $color = [0.063, 0.165, 0.235]) use ($text): void {
        $estimatedWidth = strlen($value) * $size * ($bold ? 0.54 : 0.50);
        $text($c, $value, max(36, $right - $estimatedWidth), $y, $size, $bold, $color);
    };
    $trimLine = static function (string $value, int $max): string {
        if (function_exists('mb_strlen') && mb_strlen($value, 'UTF-8') > $max) {
            return mb_substr($value, 0, $max - 1, 'UTF-8') . '…';
        }
        return strlen($value) > $max ? substr($value, 0, $max - 3) . '...' : $value;
    };

    // Base y cabecera de marca.
    $fill($commands, 1, 1, 1);
    $rect($commands, 0, 0, 595, 842);
    $fill($commands, 0.063, 0.165, 0.235);
    $rect($commands, 0, 738, 595, 104);
    $fill($commands, 0.886, 0.682, 0.396);
    $rect($commands, 38, 772, 38, 38);
    $text($commands, 'S', 50, 783, 17, true, [0.063, 0.165, 0.235]);
    $text($commands, 'SENSORIA', 89, 791, 21, true, [1, 1, 1]);
    $text($commands, 'Bienestar sensorial', 89, 775, 9, false, [0.760, 0.855, 0.875]);
    $rightText($commands, 'FACTURA DEMOSTRATIVA', 557, 793, 13, true, [1, 1, 1]);
    $rightText($commands, (string)$order['order_number'], 557, 775, 9, false, [0.760, 0.855, 0.875]);

    // Aviso académico.
    $fill($commands, 1.000, 0.961, 0.906);
    $rect($commands, 38, 696, 519, 25);
    $text($commands, 'PROTOTIPO ACADEMICO', 50, 705, 8, true, [0.604, 0.369, 0.086]);
    $text($commands, 'Sin validez fiscal · No se ha realizado ningun cobro real', 174, 705, 8, false, [0.408, 0.298, 0.176]);

    // Emisor y cliente.
    $fill($commands, 0.957, 0.976, 0.976);
    $rect($commands, 38, 590, 250, 88);
    $rect($commands, 307, 590, 250, 88);
    $text($commands, 'EMISOR FICTICIO', 52, 657, 7.5, true, [0.165, 0.435, 0.471]);
    $text($commands, 'Sensoria · Proyecto academico', 52, 640, 10.5, true);
    $text($commands, 'Calle de la Innovacion, 24', 52, 624, 8.5, false, [0.365, 0.470, 0.510]);
    $text($commands, '28014 Madrid · Espana', 52, 611, 8.5, false, [0.365, 0.470, 0.510]);
    $text($commands, 'pedidos@sensoria.onl', 52, 598, 8.5, false, [0.365, 0.470, 0.510]);
    $text($commands, 'CLIENTE', 321, 657, 7.5, true, [0.165, 0.435, 0.471]);
    $text($commands, $trimLine((string)($order['customer_name'] ?? ''), 34), 321, 640, 10.5, true);
    $text($commands, $trimLine((string)($order['customer_email'] ?? ''), 40), 321, 624, 8.5, false, [0.365, 0.470, 0.510]);
    $text($commands, $trimLine((string)($order['address'] ?? ''), 40), 321, 611, 8.5, false, [0.365, 0.470, 0.510]);
    $text($commands, $trimLine(trim((string)($order['postal_code'] ?? '') . ' ' . (string)($order['city'] ?? '')), 40), 321, 598, 8.5, false, [0.365, 0.470, 0.510]);

    // Metadatos.
    $text($commands, 'FECHA', 48, 562, 7, true, [0.290, 0.440, 0.480]);
    $text($commands, $date, 48, 548, 9.5, true);
    $text($commands, 'METODO DE PAGO', 225, 562, 7, true, [0.290, 0.440, 0.480]);
    $text($commands, 'PayPal simulado', 225, 548, 9.5, true);
    $text($commands, 'ESTADO', 418, 562, 7, true, [0.290, 0.440, 0.480]);
    $text($commands, 'PAGO SIMULADO', 418, 548, 9.5, true, [0.165, 0.435, 0.471]);

    // Tabla de productos.
    $fill($commands, 0.090, 0.247, 0.333);
    $rect($commands, 38, 506, 519, 25);
    $text($commands, 'PRODUCTO', 50, 515, 8, true, [1, 1, 1]);
    $text($commands, 'UD.', 359, 515, 8, true, [1, 1, 1]);
    $rightText($commands, 'PRECIO', 460, 515, 8, true, [1, 1, 1]);
    $rightText($commands, 'IMPORTE', 545, 515, 8, true, [1, 1, 1]);

    $items = is_array($order['items'] ?? null) ? $order['items'] : [];
    $rowY = 482;
    $shown = 0;
    foreach ($items as $item) {
        if ($shown >= 8) break;
        if ($shown % 2 === 1) {
            $fill($commands, 0.973, 0.984, 0.986);
            $rect($commands, 38, $rowY - 7, 519, 25);
        }
        $qty = max(1, (int)($item['quantity'] ?? 1));
        $unit = (float)($item['unit_price'] ?? 0);
        $text($commands, $trimLine((string)($item['product_name'] ?? 'Producto'), 42), 50, $rowY, 9);
        $text($commands, (string)$qty, 368, $rowY, 9);
        $rightText($commands, $money($unit), 460, $rowY, 9);
        $rightText($commands, $money($unit * $qty), 545, $rowY, 9, true);
        $stroke($commands, 0.855, 0.906, 0.914);
        $commands[] = sprintf('38 %.2F m 557 %.2F l S', $rowY - 8, $rowY - 8);
        $rowY -= 27;
        $shown++;
    }
    if ($shown === 0) {
        $text($commands, 'Detalle de productos no disponible', 50, $rowY, 9, false, [0.365, 0.470, 0.510]);
        $rowY -= 27;
    } elseif (count($items) > $shown) {
        $text($commands, '+ ' . (count($items) - $shown) . ' producto(s) adicional(es)', 50, $rowY, 8.5, true, [0.165, 0.435, 0.471]);
        $rowY -= 23;
    }

    // Resumen económico.
    $totalsTop = max(236, min($rowY - 14, 390));
    $fill($commands, 0.957, 0.976, 0.976);
    $rect($commands, 326, $totalsTop - 118, 231, 118);
    $labels = [
        ['Subtotal', (float)($order['subtotal'] ?? 0), false],
        ['Descuento', -(float)($order['discount'] ?? 0), false],
        ['Envio', (float)($order['shipping'] ?? 0), false],
        ['IVA (21 %)', (float)($order['tax'] ?? 0), false],
    ];
    $ty = $totalsTop - 18;
    foreach ($labels as [$label, $amount]) {
        $text($commands, $label, 342, $ty, 8.5, false, [0.365, 0.470, 0.510]);
        $rightText($commands, $money((float)$amount), 540, $ty, 8.5, true);
        $ty -= 18;
    }
    $stroke($commands, 0.165, 0.435, 0.471);
    $commands[] = sprintf('342 %.2F m 540 %.2F l S', $ty + 8, $ty + 8);
    $text($commands, 'TOTAL', 342, $ty - 10, 12, true, [0.090, 0.247, 0.333]);
    $rightText($commands, $money((float)($order['total'] ?? 0)), 540, $ty - 10, 14, true, [0.165, 0.435, 0.471]);

    // Cierre y pie.
    $text($commands, 'Gracias por elegir Sensoria', 38, 107, 11, true, [0.165, 0.435, 0.471]);
    $text($commands, 'Tu pausa empieza aqui.', 38, 91, 9, false, [0.365, 0.470, 0.510]);
    $stroke($commands, 0.855, 0.906, 0.914);
    $commands[] = '38 66 m 557 66 l S';
    $text($commands, 'Documento generado exclusivamente como evidencia funcional del prototipo academico Sensoria.', 38, 47, 7.5, false, [0.430, 0.510, 0.545]);
    $rightText($commands, 'sensoria.onl', 557, 47, 7.5, true, [0.165, 0.435, 0.471]);

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
