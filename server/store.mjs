import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {createHash,randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {resolve} from 'node:path';
export const hash=value=>createHash('sha256').update(value).digest('hex');
export class Store{
 constructor(directory,key){mkdirSync(directory,{recursive:true});this.key=key?Buffer.from(key,'base64'):null;if(this.key&&this.key.length!==32)throw Error('TOKEN_ENCRYPTION_KEY must be 32 bytes encoded as base64.');this.db=new DatabaseSync(resolve(directory,'assistant.sqlite'));this.db.exec(`PRAGMA journal_mode=WAL;PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS oauth (id TEXT PRIMARY KEY,session TEXT NOT NULL,value TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY,email TEXT NOT NULL,tokens TEXT NOT NULL,kinds TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS actions (id TEXT PRIMARY KEY,value TEXT NOT NULL,status TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS deliveries (id TEXT PRIMARY KEY,status TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS inbound (id TEXT PRIMARY KEY,created INTEGER NOT NULL);
 `);}
 seal(value){if(!this.key)throw Error('Token encryption is not configured.');const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.key,iv),body=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64');}
 unseal(value){const b=Buffer.from(value,'base64'),dec=createDecipheriv('aes-256-gcm',this.key,b.subarray(0,12));dec.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([dec.update(b.subarray(28)),dec.final()]).toString('utf8'));}
 get(id,fallback){const r=this.db.prepare('SELECT value FROM documents WHERE id=?').get(id);return r?JSON.parse(r.value):fallback;}
 set(id,value){this.db.prepare('INSERT INTO documents VALUES(?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').run(id,JSON.stringify(value));}
 accounts(){return this.db.prepare('SELECT id,email,kinds FROM accounts').all().map(a=>({...a,kinds:JSON.parse(a.kinds)}));}
 account(id){const row=this.db.prepare('SELECT * FROM accounts WHERE id=?').get(id);return row?{...row,kinds:JSON.parse(row.kinds),tokens:this.unseal(row.tokens)}:null;}
 saveAccount(a){this.db.prepare('INSERT INTO accounts VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,tokens=excluded.tokens,kinds=excluded.kinds').run(a.id,a.email,this.seal(a.tokens),JSON.stringify(a.kinds));}
 pending(){return this.db.prepare('SELECT id,value,status FROM actions ORDER BY created DESC LIMIT 100').all().map(a=>({...JSON.parse(a.value),id:a.id,status:a.status}));}
 propose(action){const id=randomBytes(12).toString('hex');this.db.prepare('INSERT INTO actions VALUES(?,?,?,?)').run(id,JSON.stringify(action),'pending',Date.now());return {...action,id,status:'pending'};}
 claim(id){const row=this.db.prepare('SELECT * FROM actions WHERE id=?').get(id);if(!row||row.status!=='pending')throw Error('This action has already been handled or is unavailable.');if(Date.now()-row.created>30*60000){this.actionStatus(id,'expired');throw Error('This approval expired. Ask the assistant to prepare it again.');}const result=this.db.prepare("UPDATE actions SET status='executing' WHERE id=? AND status='pending'").run(id);if(result.changes!==1)throw Error('This action is already in progress.');return {...JSON.parse(row.value),id};}
 actionStatus(id,status){this.db.prepare('UPDATE actions SET status=? WHERE id=?').run(status,id);}
 close(){this.db.close();}
}
