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

### Environment Variables

Create a `.env` file in the project directory with the following variables:

```bash
# Server port (optional, default: 3000)
PORT=3000

# Password for admin API endpoints (REQUIRED for production)
# This is used to authenticate requests to add/update/delete questions
ADMIN_PASSWORD=your-secure-password-here
```

**Important:** Change `ADMIN_PASSWORD` to a secure password. Without it, the default (`secret123`) will be used, which is not secure for production.

See [.env.example](.env.example) for a template.

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