# pos-icool

Monorepo NestJS gồm ba service độc lập: `central`, `ipos`, `kpos`, và thư viện dùng chung trong `libs/`. Mỗi service là một modular monolith, scale ngang bằng nhiều replica. Chi tiết quyết định nằm ở [docs/project-profile.md](docs/project-profile.md). Ràng buộc kiến trúc nằm ở `AGENTS.md` và `.ai/`.

Không có migration. Schema PostgreSQL được quản lý bên ngoài repo này.

## Chạy local

```bash
npm install
cp apps/central/.env.example apps/central/.env
cp apps/ipos/.env.example apps/ipos/.env
cp apps/kpos/.env.example apps/kpos/.env
docker compose up -d postgres redis
npm run start:central:dev
```

`ipos` lắng nghe cổng 3001, `kpos` cổng 3002.

Ba app, Postgres và Redis cùng lúc:

```bash
docker compose up --build
```

- `GET /live` — process còn sống
- `GET /ready` — Postgres sẵn sàng. Redis lỗi không làm app mất readiness.

## Kiểm tra

```bash
npm test
npm run typecheck
npm run build
```
