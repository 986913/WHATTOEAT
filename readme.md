# WhatToEat

## Run (Local Dev)

```bash
docker-compose -f docker-compose.db.yml -p [whattoeat-local] up -d
npm run dev
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:3001](http://localhost:3001)
- DB: MySQL (Docker)

## Run (Production)

```
npm run build
docker-compose -f docker-compose.prod.yml -p [whattoeat-prod] up -d --build
```

- Entry: [http://localhost:8000](http://localhost:8000)
- DB: AWS RDS
