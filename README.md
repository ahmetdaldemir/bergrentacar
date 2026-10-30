# Berg Rent A Car

Bu proje yalnızca **bergrentacar.com** için çalışır. Başka bir alan adında açılmaz. Alan adı yayından kalkarsa uygulama durur.

## Gerekenler

- Node.js 20 veya üzeri
- PostgreSQL

## Kurulum

1. Bağımlılıkları yükleyin.

```bash
cd backend && npm install
cd ../frontend && npm install
```

2. Ortam dosyasını oluşturun.

```bash
cp backend/.env.example backend/.env
```

`backend/.env` içinde veritabanı adresini, kullanıcıyı ve şifreyi doldurun.

3. Yerelde site yalnızca `http://localhost:8080` adresinde açılır. Başka bir yerel port çalışmaz.

4. Çalıştırın.

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

Yerel site `http://localhost:8080` adresindedir. İstekler aynı projedeki API’ye gider. API portu `backend/.env` içindeki `APP_PORT` değeridir.

Veritabanı yedeği `backups/bergrentacar/bergrentacar-data.sql` dosyasındadır.
