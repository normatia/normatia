# Contributing to Normatia

Thanks for your interest in contributing! This guide will help you get started.

## Repository Structure

```
packages/
  mcp-server/      # Python — MCP server for AI assistants
  normatia-sdk/    # TypeScript — SDK for the Normatia API
examples/
  python/          # Python usage examples
  typescript/      # TypeScript usage examples
  curl/            # cURL command examples
skills/            # AI agent skills (Copilot, Cursor, etc.)
```

## Development Setup

### Python (MCP Server)

```bash
cd packages/mcp-server
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
```

### Node.js (SDK)

```bash
cd packages/normatia-sdk
npm install
npm run build
```

## Code Style

- **Python**: We use [Ruff](https://docs.astral.sh/ruff/) for linting and formatting. Run `ruff check .` and `ruff format .` before committing.
- **TypeScript**: We use [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/). Run `npm run lint` and `npm run format` before committing.

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix     | Purpose                                  |
| ---------- | ---------------------------------------- |
| `feat`     | New feature                              |
| `fix`      | Bug fix                                  |
| `docs`     | Documentation only                       |
| `chore`    | Maintenance, deps, CI                    |
| `refactor` | Code change with no new feature or fix   |
| `test`     | Adding or updating tests                 |
| `style`    | Formatting, whitespace                   |

Examples:

- `feat(sdk): add verify endpoint`
- `fix(mcp): handle timeout on ask tool`
- `docs: update contributing guide`

## Pull Request Process

1. **Fork** the repository and create a branch from `main`.
2. **Name your branch** descriptively: `feat/add-verify-endpoint`, `fix/mcp-timeout`.
3. **Make your changes** with clear, focused commits.
4. **Run tests** and linters before pushing.
5. **Open a PR** against `main` with a clear description of the changes.
6. **Wait for review** — a maintainer will review and provide feedback.

## Issues and Feature Requests

- Check [existing issues](https://github.com/normatia/normatia/issues) before opening a new one.
- Use issue templates when available.
- For feature requests, describe the use case and expected behavior.
- For bugs, include steps to reproduce, expected vs. actual behavior, and your environment.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you agree to uphold this code. Please report unacceptable behavior to the maintainers.
