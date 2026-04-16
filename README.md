# Question of the Day

## Running with Docker

### Using pre-built image

```yaml
version: '3.8'

services:
  qotd:
    image: ghcr.io/sondredj/classroomscreen-qna:<tag>
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    env_file:
      - .env
```

Replace `<tag>` with a specific version (e.g., `v1.0.0`) or `latest`.

### Building locally

```yaml
version: '3.8'

services:
  qotd:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    env_file:
      - .env
```