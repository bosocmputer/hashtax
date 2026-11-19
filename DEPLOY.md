# คู่มือการ Deploy ระบบ HASH-TAX และ Mali (Local Server + Cloudflare Tunnel)

เอกสารนี้สรุปโครงสร้างการ Deploy ปัจจุบันของโดเมน `hash-tax.com` บนเครื่อง Local Server เพื่อใช้อ้างอิงเมื่อต้องการอัปเดตเว็บ เพิ่มระบบ หรือแก้ไขปัญหาในอนาคต

---

## 1. ภาพรวมสถาปัตยกรรม (Architecture)

```text
ผู้ใช้งาน (HTTPS)
   │
   ▼
Cloudflare DNS & Edge (SSL อัตโนมัติ)
   │  Nameservers: christian.ns.cloudflare.com, fay.ns.cloudflare.com
   │
   ▼
Cloudflare Tunnel: "hashtax-local" (cloudflared systemd service)
   │
   ├── https://hash-tax.com      ──► http://localhost:3002  (Docker: hashtax-web / nginx)
   ├── https://www.hash-tax.com  ──► http://localhost:3002  (Docker: hashtax-web / nginx)
   └── https://mali.hash-tax.com ──► http://localhost:3000  (Docker: mali-app / Next.js)
```

---

## 2. ข้อมูลระบบและตำแหน่งที่เกี่ยวข้อง

| รายการ | รายละเอียด |
|---|---|
| **Domain Registrar** | Squarespace Domains (รับช่วงจาก Google Domains เดิม) |
| **DNS & Tunnel** | Cloudflare (แผน Free) — บัญชีที่ผูกโซน `hash-tax.com` |
| **Nameservers** | `christian.ns.cloudflare.com`, `fay.ns.cloudflare.com` |
| **Tunnel Name** | `hashtax-local` (ดูได้ที่ Cloudflare → **Networking → Tunnels**) |
| **Local Server** | Ubuntu 22.04.5 LTS (`hastax-H610M-H2-M-2`) |
| **Server IP** | ZeroTier/VPN: `10.158.8.86` / LAN: `192.168.1.100` |
| **SSH User** | `hastax` *(เก็บรหัสผ่านไว้แยกต่างหาก ห้ามเก็บใน Git)* |
| **Path เว็บ `hashtax` บน Server** | `/home/hastax/hashtax` |
| **Path โปรแกรม `mali` บน Server** | `/home/hastax/mali` (Prod), `/home/hastax/mali-uat` (UAT) |
| **GitHub Repo (hashtax)** | `https://github.com/bosocmputer/hashtax.git` |

> **ข้อควรระวังเรื่องอีเมล:** โดเมน `hash-tax.com` ใช้งานอีเมล **Google Workspace** อยู่ด้วย ในหน้า Cloudflare **DNS → Records** ห้ามลบ record เหล่านี้:
> - `MX` `hash-tax.com` → `smtp.google.com` (Priority `1`)
> - `TXT` `hash-tax.com` → `v=spf1 include:_spf.google.com ~all`
> - `TXT` `google._domainkey` → `v=DKIM1; ...`

> **ประวัติเดิม:** ก่อนย้ายมา Local Server เว็บ `hashtax` เคย deploy ไว้บน Vercel ภายใต้ทีม `nontawats-projects-20a438de` (โปรเจค `hashtax`) ปัจจุบัน DNS ชี้มาที่ Local Server ผ่าน Cloudflare Tunnel ทั้งหมดแล้ว

---

## 3. ตาราง Routes และ Ports บน Local Server

| URL ภายนอก | Container | Port บน Server | หน้าที่ |
|---|---|---|---|
| `https://hash-tax.com` | `hashtax-web` | `3002` → `80` | เว็บหน้าบ้าน HASH-TAX (Static HTML/CSS/JS บน Nginx) |
| `https://www.hash-tax.com` | `hashtax-web` | `3002` → `80` | เว็บหน้าบ้าน HASH-TAX (เหมือนด้านบน) |
| `https://mali.hash-tax.com` | `mali-app` | `3000` → `3000` | โปรแกรมจัดการบัญชี Mali (Production) |
| *(ภายในเท่านั้น)* | `mali-uat-app` | `3001` → `3000` | โปรแกรม Mali (UAT) |

---

## 4. วิธีอัปเดตและ Deploy เว็บ `hashtax` ในอนาคต

ไฟล์ที่ใช้ในการ Deploy อยู่ในโปรเจคนี้ทั้งหมด:
- `public/` — โค้ดหน้าเว็บทั้งหมด (ปุ่ม **เข้าสู่ระบบ Mali** อยู่ใน Navbar ของ `public/index.html`)
- `Dockerfile` — Build image จาก `nginx:1.27-alpine`
- `nginx.conf` — ตั้งค่า Nginx (gzip, cache asset 7 วัน, fallback `/index.html`)
- `docker-compose.yml` — รัน container `hashtax-web` ที่ port `3002:80` (`restart: unless-stopped`)

### ขั้นตอน Deploy จากเครื่อง Mac ขึ้น Server
หลังจากแก้ไขไฟล์ใน `public/` เรียบร้อยแล้ว รันคำสั่งนี้จากโฟลเดอร์โปรเจค:

```bash
# 1. อัปโหลดไฟล์ขึ้น Server
rsync -az --delete \
  Dockerfile nginx.conf docker-compose.yml public \
  hastax@10.158.8.86:/home/hastax/hashtax/

# 2. Build และ Restart Container บน Server
ssh hastax@10.158.8.86 "cd /home/hastax/hashtax && docker compose up -d --build"
```

### ตรวจสอบหลัง Deploy
```bash
curl -sI https://hash-tax.com
curl -sI https://www.hash-tax.com
curl -sI https://mali.hash-tax.com
```

---

## 5. การเพิ่ม Subdomain / Service ใหม่ในอนาคต

1. รันแอป/Container ใหม่บน Server ด้วย Port ที่ไม่ชนกับของเดิม (เช่น `3003`)
2. เข้า Cloudflare Dashboard → **Networking → Tunnels** → เลือก **`hashtax-local`** → แท็บ **Routes** → กด **Add route** (Published application)
3. กรอก Subdomain ที่ต้องการ + Domain `hash-tax.com` + Service URL `http://localhost:<PORT>` → กด **Add route** (Cloudflare จะสร้าง DNS CNAME และ SSL ให้อัตโนมัติ)

---

## 6. การดูแลและแก้ไขปัญหาเบื้องต้น (Troubleshooting)

### 6.1 ตรวจสอบสถานะ Docker Containers
```bash
ssh hastax@10.158.8.86 "docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'"
```
- ถ้า `hashtax-web` หยุดทำงาน:
  ```bash
  ssh hastax@10.158.8.86 "cd /home/hastax/hashtax && docker compose up -d"
  ```
- ดู log ของ `hashtax-web` หรือ `mali-app`:
  ```bash
  ssh hastax@10.158.8.86 "docker logs --tail 50 hashtax-web"
  ssh hastax@10.158.8.86 "docker logs --tail 50 mali-app"
  ```

### 6.2 ตรวจสอบสถานะ Cloudflare Tunnel (`cloudflared`)
`cloudflared` ติดตั้งเป็น systemd service ที่เปิดทำงานอัตโนมัติทุกครั้งที่เครื่องรีบูต:
```bash
# เช็คสถานะ
ssh hastax@10.158.8.86 "systemctl status cloudflared --no-pager"

# ดู log ย้อนหลัง
ssh hastax@10.158.8.86 "journalctl -u cloudflared -n 50 --no-pager"

# รีสตาร์ท Tunnel (กรณีเชื่อมต่อหลุด)
ssh hastax@10.158.8.86 "sudo systemctl restart cloudflared"
```

### 6.3 กรณีเปลี่ยนเครื่อง Server ใหม่ในอนาคต
1. ติดตั้ง `docker` และ `cloudflared` บนเครื่องใหม่
2. ย้ายโฟลเดอร์ `/home/hastax/hashtax` และ `/home/hastax/mali` ไปรันบนเครื่องใหม่
3. ใน Cloudflare → **Networking → Tunnels** → `hashtax-local` → กด **Refresh token** หรือสร้าง replica ใหม่ แล้วรัน:
   ```bash
   sudo cloudflared service install <TUNNEL_TOKEN>
   ```
   Routes เดิม (`hash-tax.com`, `www.hash-tax.com`, `mali.hash-tax.com`) จะยังอยู่ครบ ไม่ต้องตั้งค่า DNS ใหม่
