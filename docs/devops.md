# Hướng dẫn chạy và khôi phục (DevOps)

## Chạy hệ thống
1. `Copy-Item .env.example .env` rồi điền giá trị thật (không commit `.env`).
2. `docker compose up -d`
3. Frontend: http://localhost:3000, Backend: http://localhost:8080

## Backup
```
mkdir backups
docker compose exec db sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" > /tmp/backup.sql'
docker compose cp db:/tmp/backup.sql ./backups/backup.sql
```

## Khôi phục
```
docker compose cp ./backups/backup.sql db:/tmp/backup.sql
docker compose exec db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" < /tmp/backup.sql'
```

## Lưu ý
- Đổi DB_PASSWORD sau khi DB đã khởi tạo sẽ gây lỗi Access denied: chạy `docker compose down -v` (xóa dữ liệu) rồi `up -d`.
- Sau khi sửa `.env` hoặc `docker-compose.yml`, chạy lại `docker compose up -d` và kiểm tra dòng `Recreated`.
- Schema DB được Flyway tạo tự động khi backend khởi động.