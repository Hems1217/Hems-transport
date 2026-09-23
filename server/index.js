import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { verifyFirebaseIdToken } from './firebaseToken.js';
import { getFirestoreUser } from './firestoreAdmin.js';
import { fileURLToPath } from 'url';

const __filename=fileURLToPath(import.meta.url), __dirname=path.dirname(__filename);
const app=express();
const PORT=Number(process.env.PORT||3001);
const pool=mysql.createPool({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'hems_transport',waitForConnections:true,connectionLimit:10,dateStrings:true});
const uploadDir=path.join(__dirname,'../uploads');
fs.mkdirSync(uploadDir,{recursive:true});
const storage=multer.diskStorage({destination:(_req,_file,cb)=>cb(null,uploadDir),filename:(_req,file,cb)=>{const ext=path.extname(file.originalname).toLowerCase();cb(null,`${Date.now()}-${crypto.randomBytes(5).toString('hex')}${ext}`)}});
const upload=multer({storage,limits:{fileSize:5*1024*1024},fileFilter:(_req,file,cb)=>{const ok=/^image\/(jpeg|png|webp)$/.test(file.mimetype);cb(ok?null:new Error('Only JPG, PNG, or WEBP receipt images are allowed.'),ok)}});

app.use(cors({origin:true,credentials:true}));
app.use(express.json());

// Server request logging — kept in the console only.
app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - started}ms)`);
  });
  next();
});
app.use(session({secret:process.env.SESSION_SECRET||'hems-local-secret',resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'lax',secure:false,maxAge:7*24*60*60*1000}}));
app.use('/uploads',express.static(uploadDir));
const ok=(res,message='',extra={})=>res.json({success:true,message,...extra});
const fail=(res,message,status=400)=>res.status(status).json({success:false,message});
const clean=v=>String(v??'').trim();
const money=n=>Number(n||0);
async function firebaseIdentity(req){
 const h=req.headers.authorization||'';
 if(!h.startsWith('Bearer ')) return null;
 const token=h.slice(7).trim();
 if(!token) return null;
 const decoded=await verifyFirebaseIdToken(token);
 return {decoded,token};
}

async function syncMysqlUser(decoded, profile={}){
 const email=clean(decoded.email);
 if(!email) throw new Error('Firebase account does not contain an email address.');
 const fullName=clean(decoded.name)||clean(profile.displayName)||email.split('@')[0];
 const [rows]=await pool.query('SELECT * FROM users WHERE email=? LIMIT 1',[email]);
 let u=rows[0];
 if(!u){
   const randomPassword=crypto.randomBytes(32).toString('hex');
   const hash=await bcrypt.hash(randomPassword,12);
   const [created]=await pool.query('INSERT INTO users(full_name,email,phone,password,address,age) VALUES(?,?,?,?,?,?)',[fullName,email,'N/A',hash,'Firebase account',18]);
   const [newRows]=await pool.query('SELECT * FROM users WHERE id=?',[created.insertId]);
   u=newRows[0];
 }
 return u;
}

async function auth(req,res,next){
 if(req.session.userId) return next();
 try{
   const identity=await firebaseIdentity(req);
   if(!identity) return fail(res,'Please log in with Firebase first.',401);
   const profile=await getFirestoreUser(identity.decoded.sub,identity.token);
   const u=await syncMysqlUser(identity.decoded,profile||{});
   req.session.userId=u.id;
   req.session.fullName=u.full_name;
   req.session.firebaseUid=identity.decoded.sub;
   req.session.firebaseRole=String(profile?.role||'user').toUpperCase()==='ADMIN'?'ADMIN':'USER';
   req.firebaseUser=identity.decoded;
   req.firebaseRole=req.session.firebaseRole;
   next();
 }catch(e){
   console.error('Firebase authentication for API:',e.message);
   fail(res,e.message||'Firebase authentication failed.',401);
 }
}

async function adminAuth(req,res,next){
 try{
   const identity=await firebaseIdentity(req);
   if(!identity) return fail(res,'Please sign in with Firebase first.',401);
   const profile=await getFirestoreUser(identity.decoded.sub,identity.token);
   if(!profile || profile.role!=='ADMIN') return fail(res,'Administrator access is required.',403);
   const u=await syncMysqlUser(identity.decoded,profile);
   req.session.userId=u.id;
   req.session.fullName=u.full_name;
   req.session.firebaseUid=identity.decoded.sub;
   req.session.firebaseRole='ADMIN';
   req.firebaseUser=identity.decoded;
   req.firebaseRole='ADMIN';
   next();
 }catch(e){
   console.error('Admin authorization:',e.message);
   fail(res,e.message||'Administrator authorization failed.',401);
 }
}
function ref(){return `HMS-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`}
async function uniqueRef(conn){let r;do{r=ref();const [rows]=await conn.query('SELECT id FROM bookings WHERE booking_reference=?',[r]);if(!rows.length)return r}while(true)}

app.get('/api/health',async(_req,res)=>{try{await pool.query('SELECT 1');ok(res,'API and database are working.')}catch{fail(res,'Database connection failed. Start MySQL in XAMPP and import database/hems_transport.sql.',500)}});
app.get('/api/me',auth,async(req,res)=>{const [rows]=await pool.query('SELECT id,full_name,email,phone,address,age FROM users WHERE id=?',[req.session.userId]);if(!rows[0])return fail(res,'User not found.',404);ok(res,'',{user:{...rows[0],role:req.session.firebaseRole||'USER',firebaseUid:req.session.firebaseUid||null}})});
app.post('/api/register-profile',async(req,res)=>{
 try{
  const identity=await firebaseIdentity(req);
  if(!identity)return fail(res,'Missing Firebase ID token.',401);
  const profile=await getFirestoreUser(identity.decoded.sub,identity.token);
  if(!profile)return fail(res,'Firestore user profile not found.',403);
  const u=await syncMysqlUser(identity.decoded,{displayName:clean(req.body.full_name)||profile.displayName});
  const fullName=clean(req.body.full_name)||u.full_name;
  const phone=clean(req.body.phone)||u.phone||'N/A';
  const address=clean(req.body.address)||u.address||'Firebase account';
  const age=Number(req.body.age)||u.age||18;
  await pool.query('UPDATE users SET full_name=?,phone=?,address=?,age=? WHERE id=?',[fullName,phone,address,age,u.id]);
  ok(res,'Application profile synchronized.',{user:{id:u.id,full_name:fullName,email:u.email}});
 }catch(e){fail(res,e.message||'Unable to synchronize application profile.',500)}
});

app.post('/api/firebase-login',async(req,res)=>{
 try{
  const identity=await firebaseIdentity(req);
  if(!identity)return fail(res,'Missing Firebase ID token.',401);
  const profile=await getFirestoreUser(identity.decoded.sub,identity.token);
  if(!profile)return fail(res,'Your Firebase account has no Firestore users profile. Create users/'+identity.decoded.sub+' with role USER or ADMIN.',403);
  const u=await syncMysqlUser(identity.decoded,profile);
  req.session.userId=u.id;
  req.session.fullName=u.full_name;
  req.session.firebaseUid=identity.decoded.sub;
  req.session.firebaseRole=String(profile.role||'user').toUpperCase()==='ADMIN'?'ADMIN':'USER';
  req.session.authProvider='firebase';
  console.log(`[ACTION] login firebaseUid=${req.session.firebaseUid} role=${req.session.firebaseRole}`);
  ok(res,'Firebase login synchronized with Hems Transport.',{user:{id:u.id,full_name:u.full_name,email:u.email},role:req.session.firebaseRole});
 }catch(e){
  console.error('Firebase login synchronization:',e.message);
  fail(res,e.message||'Unable to synchronize Firebase login.',500);
 }
});

// Password authentication is handled by Firebase Authentication.
app.post('/api/login',async(_req,res)=>fail(res,'Email/password authentication is handled by Firebase Authentication. Please use the Firebase login form.',410));

app.post('/api/logout',(req,res)=>{ console.log(`[ACTION] logout user=${req.session?.firebaseUid||'unknown'}`); req.session.destroy(()=>ok(res,'Logged out.')); });

app.get('/api/municipalities',async(_req,res)=>{const [rows]=await pool.query('SELECT id,name,province,is_capital,manila_port,routing_note FROM municipalities ORDER BY display_order');ok(res,'',{municipalities:rows})});
app.get('/api/data-check',async(_req,res)=>{try{const [[m]]=await pool.query('SELECT COUNT(*) count FROM municipalities');const [[r]]=await pool.query('SELECT COUNT(*) count FROM routes');const [[s]]=await pool.query('SELECT COUNT(*) count FROM schedules');ok(res,'',{counts:{municipalities:Number(m.count),routes:Number(r.count),schedules:Number(s.count)}})}catch(e){fail(res,`Database check failed: ${e.message}`,500)}});
app.get('/api/routes',async(_req,res)=>{try{const [rows]=await pool.query(`SELECT r.id,t1.terminal_name origin,t2.terminal_name destination,r.fare,r.via_port,t1.terminal_type origin_type,t2.terminal_type destination_type,COALESCE(m1.name,m2.name) municipality,COALESCE(m1.province,m2.province) province,COALESCE(m1.display_order,m2.display_order) display_order FROM routes r INNER JOIN terminals t1 ON t1.id=r.origin_terminal_id INNER JOIN terminals t2 ON t2.id=r.destination_terminal_id LEFT JOIN municipalities m1 ON m1.name=REPLACE(t1.terminal_name,' Terminal','') AND t1.terminal_type='Mindoro' LEFT JOIN municipalities m2 ON m2.name=REPLACE(t2.terminal_name,' Terminal','') AND t2.terminal_type='Mindoro' ORDER BY display_order,t1.terminal_type,t1.id,t2.terminal_type,t2.id`);ok(res,'',{routes:rows})}catch(e){fail(res,`Unable to load routes. Check that the latest hems_transport.sql was imported into MySQL. ${e.message}`,500)}});
app.get('/api/terminals',async(_req,res)=>{const [rows]=await pool.query(`SELECT id,terminal_name,location,address,terminal_type FROM terminals ORDER BY terminal_type, id`);ok(res,'',{terminals:rows})});
app.get('/api/schedules',async(req,res)=>{try{const date=req.query.date||new Date().toISOString().slice(0,10),route=Number(req.query.route_id||0);let sql=`SELECT s.id,s.travel_date,TIME_FORMAT(s.departure_time,'%h:%i %p') departure_time,TIME_FORMAT(s.arrival_time,'%h:%i %p') arrival_time,s.available_seats,b.bus_number,b.plate_number,b.bus_type,d.full_name driver_name,r.fare,r.via_port,t1.terminal_name origin,t2.terminal_name destination FROM schedules s INNER JOIN routes r ON r.id=s.route_id INNER JOIN terminals t1 ON t1.id=r.origin_terminal_id INNER JOIN terminals t2 ON t2.id=r.destination_terminal_id INNER JOIN buses b ON b.id=s.bus_id INNER JOIN drivers d ON d.id=b.driver_id WHERE s.travel_date=? AND s.available_seats>0`;const params=[date];if(route){sql+=' AND r.id=?';params.push(route)}sql+=' ORDER BY s.departure_time';const [rows]=await pool.query(sql,params);ok(res,'',{schedules:rows})}catch(e){fail(res,`Unable to load schedules. Check the database import and MySQL in XAMPP. ${e.message}`,500)}});
app.get('/api/nearby',auth,async(req,res)=>{const [[u]]=await pool.query('SELECT address FROM users WHERE id=?',[req.session.userId]);const address=(u?.address||'').toLowerCase();const map={calapan:'Calapan City Terminal',roxas:'Roxas Terminal','san jose':'San Jose Terminal',sablayan:'Sablayan Terminal',mamburao:'Mamburao Terminal','abra de ilog':'Abra de Ilog Terminal'};let found='Calapan City Terminal';for(const [key,name] of Object.entries(map))if(address.includes(key)){found=name;break}const [[t]]=await pool.query('SELECT id,terminal_name,location,address FROM terminals WHERE terminal_name=?',[found]);if(!t)return fail(res,'Nearby terminal not found.',404);const [routes]=await pool.query(`SELECT t2.terminal_name destination FROM routes r JOIN terminals t1 ON t1.id=r.origin_terminal_id JOIN terminals t2 ON t2.id=r.destination_terminal_id WHERE t1.id=?`,[t.id]);ok(res,'',{terminal:{terminal_name:t.terminal_name,location:t.location,routes:routes.map(x=>`${t.terminal_name} → ${x.destination}`)}})});

app.post('/api/bookings',auth,upload.single('receipt_evidence'),async(req,res)=>{
 const {schedule_id,passenger_name,passenger_address,passenger_age,contact_number,discount_type,payment_method,gcash_name,gcash_number,gcash_reference,cardholder_name,card_number,card_expiry,card_cvv}=req.body;
 if(![schedule_id,passenger_name,passenger_address,passenger_age,contact_number,discount_type,payment_method].every(v=>clean(v)))return fail(res,'Missing booking information.');
 if(!['GCash','Credit Card'].includes(payment_method))return fail(res,'Unsupported payment method.');
 if(!req.file)return fail(res,'Please upload a clear payment receipt/evidence image.');
 if(payment_method==='GCash' && ![gcash_name,gcash_number,gcash_reference].every(v=>clean(v)))return fail(res,'For GCash, provide account name, GCash number, and reference number.');
 if(payment_method==='Credit Card' && ![cardholder_name,card_number,card_expiry,card_cvv].every(v=>clean(v)))return fail(res,'For credit card, provide cardholder name, card number, expiry date, and CVV.');
 if(payment_method==='Credit Card' && !/^\d{13,19}$/.test(clean(card_number).replace(/\s+/g,'')))return fail(res,'Enter a valid card number (13–19 digits).');
 if(payment_method==='Credit Card' && !/^\d{3,4}$/.test(clean(card_cvv)))return fail(res,'Enter a valid CVV.');
 if(payment_method==='GCash' && !/^09\d{9}$/.test(clean(gcash_number).replace(/\s+/g,'')))return fail(res,'Enter a valid 11-digit GCash number.');
 const conn=await pool.getConnection();
 try{
  await conn.beginTransaction();
  const [[s]]=await conn.query(`SELECT s.*,r.fare FROM schedules s JOIN routes r ON r.id=s.route_id WHERE s.id=? FOR UPDATE`,[Number(schedule_id)]);
  if(!s)throw new Error('Schedule not found.');
  if(Number(s.available_seats)<1)throw new Error('No seats available.');
  const discount=['Student','PWD','Senior Citizen'].includes(discount_type)?0.20:0;
  const discountAmount=Math.round(Number(s.fare)*discount*100)/100;
  const total=Math.round((Number(s.fare)-discountAmount)*100)/100;
  const bookingRef=await uniqueRef(conn);
  const [b]=await conn.query(`INSERT INTO bookings(booking_reference,user_id,schedule_id,passenger_name,passenger_address,passenger_age,contact_number,discount_type,discount_amount,total_amount,booking_status) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,[bookingRef,req.session.userId,Number(schedule_id),clean(passenger_name),clean(passenger_address),Number(passenger_age),clean(contact_number),discount_type,discountAmount,total,'CONFIRMED']);
  const transactionRef=payment_method==='GCash'?clean(gcash_reference):`CARD-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
  const accountName=payment_method==='GCash'?clean(gcash_name):null;
  const accountNumber=payment_method==='GCash'?clean(gcash_number):null;
  const cardLast4=payment_method==='Credit Card'?clean(card_number).replace(/\s+/g,'').slice(-4):null;
  const evidence=`/uploads/${req.file.filename}`;
  await conn.query(`INSERT INTO payments(booking_id,payment_method,amount,payment_status,transaction_reference,account_name,account_number,cardholder_name,card_last4,receipt_evidence,paid_at) VALUES(?,?,?,?,?,?,?,?,?,?,NULL)`,[b.insertId,payment_method,total,'PENDING',transactionRef,accountName,accountNumber,payment_method==='Credit Card'?clean(cardholder_name):null,cardLast4,evidence]);
  await conn.query('UPDATE schedules SET available_seats=available_seats-1 WHERE id=?',[Number(schedule_id)]);
  await conn.commit();
  console.log(`[ACTION] booking-created ref=${bookingRef} user=${req.session.firebaseUid||'unknown'} payment=${payment_method}`);
  ok(res,'Booking reserved. Your payment evidence was submitted for verification.',{booking_reference:bookingRef,payment_status:'PENDING'});
 }catch(e){await conn.rollback();if(req.file)try{fs.unlinkSync(req.file.path)}catch{};fail(res,e.message||'Unable to create booking.',400)}finally{conn.release()}
});

const bookingQuery=`SELECT b.*,p.payment_method,p.payment_status,p.transaction_reference,p.account_name,p.account_number,p.cardholder_name,p.card_last4,p.receipt_evidence,TIME_FORMAT(s.departure_time,'%h:%i %p') departure_time,TIME_FORMAT(s.arrival_time,'%h:%i %p') arrival_time,s.travel_date,bus.bus_number,bus.plate_number,d.full_name driver_name,t1.terminal_name origin,t2.terminal_name destination,r.via_port FROM bookings b JOIN schedules s ON s.id=b.schedule_id JOIN routes r ON r.id=s.route_id JOIN terminals t1 ON t1.id=r.origin_terminal_id JOIN terminals t2 ON t2.id=r.destination_terminal_id JOIN buses bus ON bus.id=s.bus_id JOIN drivers d ON d.id=bus.driver_id JOIN payments p ON p.booking_id=b.id`;
app.get('/api/bookings/mine',auth,async(req,res)=>{const [rows]=await pool.query(`${bookingQuery} WHERE b.user_id=? ORDER BY b.created_at DESC`,[req.session.userId]);ok(res,'',{bookings:rows})});
app.get('/api/bookings/receipt',auth,async(req,res)=>{const [rows]=await pool.query(`${bookingQuery} WHERE b.booking_reference=? AND b.user_id=? LIMIT 1`,[clean(req.query.ref),req.session.userId]);if(!rows[0])return fail(res,'Receipt not found.',404);ok(res,'',{booking:rows[0]})});
app.get('/api/verify',async(req,res)=>{const [rows]=await pool.query(`SELECT b.booking_reference,b.passenger_name,b.booking_status,p.payment_status,p.payment_method,TIME_FORMAT(s.departure_time,'%h:%i %p') departure_time,s.travel_date,bus.bus_number,t1.terminal_name origin,t2.terminal_name destination,r.via_port FROM bookings b JOIN schedules s ON s.id=b.schedule_id JOIN routes r ON r.id=s.route_id JOIN terminals t1 ON t1.id=r.origin_terminal_id JOIN terminals t2 ON t2.id=r.destination_terminal_id JOIN buses bus ON bus.id=s.bus_id JOIN payments p ON p.booking_id=b.id WHERE b.booking_reference=? LIMIT 1`,[clean(req.query.ref)]);const b=rows[0];if(!b||b.booking_status!=='CONFIRMED')return fail(res,'Booking is invalid or cancelled.');ok(res,'Valid booking.',{booking:b})});


app.get('/api/admin/dashboard',adminAuth,async(_req,res)=>{try{
 const [[users]]=await pool.query('SELECT COUNT(*) count FROM users');
 const [[bookings]]=await pool.query('SELECT COUNT(*) count FROM bookings');
 const [[pending]]=await pool.query("SELECT COUNT(*) count FROM payments WHERE payment_status='PENDING'");
 const [[buses]]=await pool.query('SELECT COUNT(*) count FROM buses');
 const [[schedules]]=await pool.query('SELECT COUNT(*) count FROM schedules');
 ok(res,'',{stats:{users:Number(users.count),bookings:Number(bookings.count),pendingPayments:Number(pending.count),buses:Number(buses.count),schedules:Number(schedules.count)}});
}catch(e){fail(res,`Unable to load admin dashboard: ${e.message}`,500)}});

app.get('/api/admin/bookings',adminAuth,async(_req,res)=>{try{const [rows]=await pool.query(`${bookingQuery} JOIN users u ON u.id=b.user_id ORDER BY b.created_at DESC`);ok(res,'',{bookings:rows})}catch(e){fail(res,`Unable to load bookings: ${e.message}`,500)}});
app.get('/api/admin/payments',adminAuth,async(_req,res)=>{try{const [rows]=await pool.query(`SELECT p.*,b.booking_reference,b.passenger_name,u.full_name user_name,u.email,s.travel_date,TIME_FORMAT(s.departure_time,'%h:%i %p') departure_time,t1.terminal_name origin,t2.terminal_name destination FROM payments p JOIN bookings b ON b.id=p.booking_id JOIN users u ON u.id=b.user_id JOIN schedules s ON s.id=b.schedule_id JOIN routes r ON r.id=s.route_id JOIN terminals t1 ON t1.id=r.origin_terminal_id JOIN terminals t2 ON t2.id=r.destination_terminal_id ORDER BY p.id DESC`);ok(res,'',{payments:rows})}catch(e){fail(res,`Unable to load payments: ${e.message}`,500)}});
app.get('/api/admin/users',adminAuth,async(_req,res)=>{try{const [rows]=await pool.query('SELECT id,full_name,email,phone,address,age,created_at FROM users ORDER BY created_at DESC');ok(res,'',{users:rows})}catch(e){fail(res,`Unable to load users: ${e.message}`,500)}});
app.get('/api/admin/schedules',adminAuth,async(_req,res)=>{try{const [rows]=await pool.query(`SELECT s.id,s.travel_date,TIME_FORMAT(s.departure_time,'%h:%i %p') departure_time,TIME_FORMAT(s.arrival_time,'%h:%i %p') arrival_time,s.available_seats,b.bus_number,b.plate_number,b.bus_type,d.full_name driver_name,r.fare,r.via_port,t1.terminal_name origin,t2.terminal_name destination FROM schedules s JOIN routes r ON r.id=s.route_id JOIN terminals t1 ON t1.id=r.origin_terminal_id JOIN terminals t2 ON t2.id=r.destination_terminal_id JOIN buses b ON b.id=s.bus_id JOIN drivers d ON d.id=b.driver_id ORDER BY s.travel_date DESC,s.departure_time`);ok(res,'',{schedules:rows})}catch(e){fail(res,`Unable to load schedules: ${e.message}`,500)}});

app.patch('/api/admin/payments/:id',adminAuth,async(req,res)=>{const status=String(req.body.status||'').toUpperCase();if(!['PAID','FAILED'].includes(status))return fail(res,'Payment status must be PAID or FAILED.');const conn=await pool.getConnection();try{await conn.beginTransaction();const [[p]]=await conn.query('SELECT p.*,b.schedule_id,b.booking_status FROM payments p JOIN bookings b ON b.id=p.booking_id WHERE p.id=? FOR UPDATE',[Number(req.params.id)]);if(!p)throw new Error('Payment not found.');if(p.payment_status===status){await conn.rollback();return ok(res,'Payment already has that status.')}await conn.query('UPDATE payments SET payment_status=?,paid_at=? WHERE id=?',[status,status==='PAID'?new Date():null,Number(req.params.id)]);if(status==='FAILED' && p.booking_status!=='CANCELLED'){await conn.query("UPDATE bookings SET booking_status='CANCELLED' WHERE id=?",[p.booking_id]);await conn.query('UPDATE schedules SET available_seats=available_seats+1 WHERE id=?',[p.schedule_id]);}if(status==='PAID' && p.booking_status==='CANCELLED'){throw new Error('Cancelled bookings cannot be marked paid.')}await conn.commit();ok(res,`Payment marked ${status}.`)}catch(e){await conn.rollback();fail(res,e.message||'Unable to update payment.',400)}finally{conn.release()}});

app.patch('/api/admin/bookings/:id',adminAuth,async(req,res)=>{const status=String(req.body.status||'').toUpperCase();if(!['CONFIRMED','COMPLETED','CANCELLED'].includes(status))return fail(res,'Invalid booking status.');const conn=await pool.getConnection();try{await conn.beginTransaction();const [[b]]=await conn.query('SELECT * FROM bookings WHERE id=? FOR UPDATE',[Number(req.params.id)]);if(!b)throw new Error('Booking not found.');if(b.booking_status===status){await conn.rollback();return ok(res,'Booking already has that status.')}if(status==='CANCELLED' && b.booking_status!=='CANCELLED')await conn.query('UPDATE schedules SET available_seats=available_seats+1 WHERE id=?',[b.schedule_id]);if(status!=='CANCELLED' && b.booking_status==='CANCELLED')await conn.query('UPDATE schedules SET available_seats=GREATEST(available_seats-1,0) WHERE id=?',[b.schedule_id]);await conn.query('UPDATE bookings SET booking_status=? WHERE id=?',[status,Number(req.params.id)]);await conn.commit();console.log(`[ACTION] admin-booking-status id=${req.params.id} status=${status} admin=${req.session.firebaseUid||'unknown'}`);ok(res,`Booking marked ${status}.`)}catch(e){await conn.rollback();fail(res,e.message||'Unable to update booking.',400)}finally{conn.release()}});

app.use(express.static(path.join(__dirname,'../dist')));
app.use((err,_req,res,_next)=>{if(err instanceof multer.MulterError)return fail(res,err.code==='LIMIT_FILE_SIZE'?'Receipt image must be 5 MB or smaller.':err.message);if(err) return fail(res,err.message||'Upload failed.');});
app.use((req,res,next)=>{if(req.path.startsWith('/api/'))return fail(res,'API endpoint not found.',404);if(req.method==='GET')return res.sendFile(path.join(__dirname,'../dist/index.html'));next()});
app.listen(PORT,()=>console.log(`Hems Transport API: http://localhost:${PORT}`));
