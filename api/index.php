<?php
declare(strict_types=1);
session_start();
require dirname(__DIR__) . '/config.php';
require dirname(__DIR__) . '/lib/notifications.php';

$action = (string)($_GET['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($action === 'products' && $method === 'GET') {
        $all = !empty($_GET['all']);
        $sql = 'SELECT * FROM products' . ($all ? '' : ' WHERE active=1') . ' ORDER BY id';
        respond(['products' => db()->query($sql)->fetchAll()]);
    }

    if ($action === 'session' && $method === 'GET') respond(['user' => $_SESSION['user'] ?? null]);

    if ($action === 'register' && $method === 'POST') {
        $b = json_input(); $name = trim((string)($b['name'] ?? '')); $email = strtolower(trim((string)($b['email'] ?? ''))); $password = (string)($b['password'] ?? '');
        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 6) respond(['error'=>'Revisa el nombre, correo y contraseña'], 422);
        $stmt = db()->prepare('INSERT INTO users(name,email,password_hash) VALUES(?,?,?)');
        $stmt->execute([$name,$email,password_hash($password,PASSWORD_DEFAULT)]);
        $_SESSION['user']=['id'=>(int)db()->lastInsertId(),'name'=>$name,'email'=>$email,'role'=>'customer'];
        respond(['user'=>$_SESSION['user']],201);
    }

    if ($action === 'login' && $method === 'POST') {
        $b=json_input(); $email=strtolower(trim((string)($b['email']??''))); $stmt=db()->prepare('SELECT * FROM users WHERE email=?');$stmt->execute([$email]);$user=$stmt->fetch();
        if(!$user||!password_verify((string)($b['password']??''),$user['password_hash'])) respond(['error'=>'Correo o contraseña incorrectos'],401);
        $_SESSION['user']=['id'=>(int)$user['id'],'name'=>$user['name'],'email'=>$user['email'],'role'=>$user['role']]; respond(['user'=>$_SESSION['user']]);
    }

    if ($action === 'logout' && $method === 'POST') { session_destroy(); respond(['ok'=>true]); }

    if ($action === 'coupon' && $method === 'GET') {
        $code=strtoupper(trim((string)($_GET['code']??'')));$subtotal=(float)($_GET['subtotal']??0);$stmt=db()->prepare('SELECT * FROM coupons WHERE code=? AND active=1 AND starts_at<=CURDATE() AND ends_at>=CURDATE() AND used_count<max_uses');$stmt->execute([$code]);$c=$stmt->fetch();
        $valid=$c&&$subtotal>=(float)$c['minimum_amount'];respond(['valid'=>(bool)$valid,'discount_percent'=>$valid?(int)$c['discount_percent']:0,'minimum_amount'=>$c?(float)$c['minimum_amount']:0]);
    }

    if ($action === 'checkout' && $method === 'POST') {
        $b=json_input();$items=$b['items']??[];$email=strtolower(trim((string)($b['email']??'')));
        if(!filter_var($email,FILTER_VALIDATE_EMAIL)||!is_array($items)||!count($items))respond(['error'=>'Datos de compra incompletos'],422);
        $pdo=db();$pdo->beginTransaction();
        $ids=array_values(array_unique(array_map(fn($i)=>(int)($i['id']??0),$items)));$marks=implode(',',array_fill(0,count($ids),'?'));$stmt=$pdo->prepare("SELECT * FROM products WHERE active=1 AND id IN ($marks) FOR UPDATE");$stmt->execute($ids);$products=[];foreach($stmt->fetchAll() as $p)$products[(int)$p['id']]=$p;
        $subtotal=0;$lines=[];foreach($items as $i){$id=(int)($i['id']??0);$qty=max(1,min(10,(int)($i['quantity']??1)));if(!isset($products[$id])||$qty>(int)$products[$id]['stock'])throw new RuntimeException('Un producto no tiene stock suficiente');$subtotal+=(float)$products[$id]['price']*$qty;$lines[]=[$products[$id],$qty];}
        $coupon=strtoupper(trim((string)($b['coupon']??'')));$percent=0;$couponId=null;if($coupon!==''){$stmt=$pdo->prepare('SELECT * FROM coupons WHERE code=? AND active=1 AND starts_at<=CURDATE() AND ends_at>=CURDATE() AND used_count<max_uses FOR UPDATE');$stmt->execute([$coupon]);$c=$stmt->fetch();if(!$c||$subtotal<(float)$c['minimum_amount'])throw new RuntimeException('El cupón no es válido');$percent=(int)$c['discount_percent'];$couponId=(int)$c['id'];}
        $discount=round($subtotal*$percent/100,2);$shipping=($b['shipping']??'standard')==='express'?8.95:($subtotal>=80?0:4.95);$tax=round(($subtotal-$discount+$shipping)*.21,2);$total=round($subtotal-$discount+$shipping+$tax,2);$number='SEN-'.date('Ymd').'-'.strtoupper(substr(bin2hex(random_bytes(4)),0,6));$user=$_SESSION['user']??null;
        $stmt=$pdo->prepare('INSERT INTO orders(order_number,user_id,customer_name,customer_email,phone,address,city,postal_code,subtotal,discount,shipping,tax,total,coupon_code,payment_method) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');$stmt->execute([$number,$user['id']??null,trim((string)($b['name']??'')),$email,trim((string)($b['phone']??'')),trim((string)($b['address']??'')),trim((string)($b['city']??'')),trim((string)($b['postal']??'')),$subtotal,$discount,$shipping,$tax,$total,$coupon?:null,(string)($b['payment']??'Tarjeta de prueba')]);$orderId=(int)$pdo->lastInsertId();
        $itemStmt=$pdo->prepare('INSERT INTO order_items(order_id,product_id,product_name,quantity,unit_price) VALUES(?,?,?,?,?)');$stockStmt=$pdo->prepare('UPDATE products SET stock=stock-? WHERE id=?');foreach($lines as[$p,$q]){$itemStmt->execute([$orderId,$p['id'],$p['name'],$q,$p['price']]);$stockStmt->execute([$q,$p['id']]);}
        if($couponId){$pdo->prepare('UPDATE coupons SET used_count=used_count+1 WHERE id=?')->execute([$couponId]);}
        $pdo->prepare('INSERT INTO events(event_type,session_id,order_id,payload) VALUES(\'order.created\',?,?,?)')->execute([(string)($b['session_id']??'WEB'),$orderId,json_encode(['total'=>$total])]);$pdo->commit();
        $order=['id'=>$orderId,'order_number'=>$number,'customer_name'=>trim((string)($b['name']??'')),'customer_email'=>$email,'phone'=>trim((string)($b['phone']??'')),'subtotal'=>$subtotal,'discount'=>$discount,'shipping'=>$shipping,'tax'=>$tax,'total'=>$total,'status'=>'PAGO_SIMULADO'];
        try {$notifications=dispatch_order_notifications($pdo,$order,'PAGO_SIMULADO');}catch(Throwable $notificationError){$notifications=[['channel'=>'SISTEMA','recipient'=>'','delivery_status'=>'ERROR','error_message'=>'Ejecuta migration_002_notifications.sql']];}
        respond(['order'=>$order,'notifications'=>$notifications],201);
    }

    if ($action === 'my_orders' && $method === 'GET') {
        $user=require_login();$stmt=db()->prepare('SELECT * FROM orders WHERE user_id=? OR customer_email=? ORDER BY id DESC');$stmt->execute([$user['id'],$user['email']]);$orders=$stmt->fetchAll();respond(['orders'=>attach_order_data($orders)]);
    }

    if ($action === 'return_request' && $method === 'POST') {
        $user=require_login();$b=json_input();$stmt=db()->prepare('SELECT * FROM orders WHERE id=? AND (user_id=? OR customer_email=?)');$stmt->execute([(int)($b['order_id']??0),$user['id'],$user['email']]);$order=$stmt->fetch();if(!$order)respond(['error'=>'Pedido no encontrado'],404);$stmt=db()->prepare('INSERT INTO returns(order_id,reason,details,refund_amount) VALUES(?,?,?,?)');$stmt->execute([$order['id'],trim((string)($b['reason']??'')),trim((string)($b['details']??'')),$order['total']]);respond(['ok'=>true],201);
    }

    if ($action === 'admin_data' && $method === 'GET') {
        require_admin();$orders=attach_order_data(db()->query('SELECT * FROM orders ORDER BY id DESC LIMIT 100')->fetchAll());$products=db()->query('SELECT * FROM products ORDER BY id')->fetchAll();$coupons=db()->query('SELECT * FROM coupons ORDER BY id DESC')->fetchAll();$returns=db()->query('SELECT r.*,o.order_number,o.customer_name FROM returns r JOIN orders o ON o.id=r.order_id ORDER BY r.id DESC')->fetchAll();$notifications=db()->query('SELECT n.*,o.order_number FROM notifications n JOIN orders o ON o.id=n.order_id ORDER BY n.id DESC LIMIT 100')->fetchAll();$events=db()->query('SELECT * FROM events ORDER BY id DESC LIMIT 200')->fetchAll();$notification_config=['email_enabled'=>MAIL_ENABLED,'sms_enabled'=>SMS_ENABLED,'from_email'=>MAIL_ENABLED?SMTP_FROM_EMAIL:null,'sms_sender'=>SMS_ENABLED?TWILIO_FROM_NUMBER:null];respond(compact('orders','products','coupons','returns','notifications','events','notification_config'));
    }

    if ($action === 'crm' && $method === 'GET') {
        require_admin();$sql="SELECT customer_email email,MAX(customer_name) name,COUNT(*) orders,ROUND(SUM(total),2) spend,MAX(created_at) last_order,CASE WHEN SUM(total)>=500 OR COUNT(*)>=4 THEN 'VIP' WHEN COUNT(*)>=2 THEN 'Recurrente' ELSE 'Nuevo' END segment FROM orders GROUP BY customer_email ORDER BY spend DESC";respond(['customers'=>db()->query($sql)->fetchAll()]);
    }

    if ($action === 'order_status' && $method === 'POST') {
        require_admin();$b=json_input();$valid=['PAGO_SIMULADO','PREPARACION','ENVIADO','ENTREGADO','CANCELADO'];$status=(string)($b['status']??'');if(!in_array($status,$valid,true))respond(['error'=>'Estado no válido'],422);$pdo=db();$stmt=$pdo->prepare('UPDATE orders SET status=? WHERE id=?');$stmt->execute([$status,(int)$b['id']]);$stmt=$pdo->prepare('SELECT * FROM orders WHERE id=?');$stmt->execute([(int)$b['id']]);$order=$stmt->fetch();if(!$order)respond(['error'=>'Pedido no encontrado'],404);$notifications=dispatch_order_notifications($pdo,$order,$status);respond(['ok'=>true,'notifications'=>$notifications]);
    }

    if ($action === 'product_save' && $method === 'POST') {
        require_admin();$b=json_input();$id=(int)($b['id']??0);if($id){$stmt=db()->prepare('UPDATE products SET name=?,category=?,description=?,long_description=?,price=?,stock=?,image=? WHERE id=?');$stmt->execute([$b['name'],$b['category'],$b['description'],$b['long_description'],$b['price'],$b['stock'],$b['image'],$id]);}else{$stmt=db()->prepare('INSERT INTO products(sku,name,category,description,long_description,price,stock,image) VALUES(?,?,?,?,?,?,?,?)');$stmt->execute([$b['sku'],$b['name'],$b['category'],$b['description'],$b['long_description'],$b['price'],$b['stock'],$b['image']]);}respond(['ok'=>true]);
    }

    if ($action === 'product_toggle' && $method === 'POST') {require_admin();$b=json_input();db()->prepare('UPDATE products SET active=? WHERE id=?')->execute([(int)!empty($b['active']),(int)$b['id']]);respond(['ok'=>true]);}
    if ($action === 'coupon_create' && $method === 'POST') {require_admin();$b=json_input();$stmt=db()->prepare('INSERT INTO coupons(code,discount_percent,minimum_amount,max_uses,starts_at,ends_at) VALUES(?,?,?,?,?,?)');$stmt->execute([strtoupper(trim($b['code'])),$b['discount_percent'],$b['minimum_amount'],$b['max_uses'],$b['starts_at'],$b['ends_at']]);respond(['ok'=>true],201);}
    if ($action === 'coupon_toggle' && $method === 'POST') {require_admin();$b=json_input();db()->prepare('UPDATE coupons SET active=? WHERE id=?')->execute([(int)!empty($b['active']),(int)$b['id']]);respond(['ok'=>true]);}
    if ($action === 'return_status' && $method === 'POST') {require_admin();$b=json_input();$valid=['SOLICITADA','APROBADA','RECHAZADA','REEMBOLSO_SIMULADO'];if(!in_array($b['status']??'',$valid,true))respond(['error'=>'Estado no válido'],422);db()->prepare('UPDATE returns SET status=? WHERE id=?')->execute([$b['status'],(int)$b['id']]);respond(['ok'=>true]);}
    if ($action === 'event' && $method === 'POST') {$b=json_input();$stmt=db()->prepare('INSERT INTO events(event_type,session_id,product_id,payload) VALUES(?,?,?,?)');$stmt->execute([substr((string)($b['type']??'interaction'),0,60),substr((string)($b['session_id']??'WEB'),0,80),!empty($b['product_id'])?(int)$b['product_id']:null,json_encode($b['payload']??[]) ]);respond(['ok'=>true],201);}

    respond(['error'=>'Ruta no encontrada'],404);
} catch (PDOException $e) {
    $code=(int)$e->getCode()===23000?409:500;respond(['error'=>$code===409?'El registro ya existe':'Error de base de datos. Revisa config.php e install.php'], $code);
} catch (Throwable $e) { if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack(); respond(['error'=>$e->getMessage()],500); }

function attach_order_data(array $orders): array {
    if(!$orders)return[];$ids=array_column($orders,'id');$marks=implode(',',array_fill(0,count($ids),'?'));$stmt=db()->prepare("SELECT * FROM order_items WHERE order_id IN ($marks)");$stmt->execute($ids);$items=$stmt->fetchAll();$stmt=db()->prepare("SELECT * FROM notifications WHERE order_id IN ($marks) ORDER BY id");$stmt->execute($ids);$notifications=$stmt->fetchAll();foreach($orders as &$o){$o['items']=array_values(array_filter($items,fn($i)=>$i['order_id']==$o['id']));$o['notifications']=array_values(array_filter($notifications,fn($n)=>$n['order_id']==$o['id']));}return $orders;
}
