[🇬🇧 English](./README.md) | [🇪🇸 Español](./README.es.md)

# Normatia

Kit de herramientas de código abierto para el cumplimiento del Código Técnico de la Edificación en España.

[![npm version](https://img.shields.io/npm/v/normatia?label=npm%20normatia)](https://www.npmjs.com/package/normatia)
[![License: MIT](https://img.shields.io/github/license/normatia/normatia)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/normatia/normatia?style=social)](https://github.com/normatia/normatia)

Sitio principal: [normatia.com](https://normatia.com)  
Documentación API: [docs.normatia.com](https://docs.normatia.com)  
Base de la API: [api.normatia.com](https://api.normatia.com)

## ¿Qué es Normatia?

Normatia es una plataforma de cumplimiento normativo de la edificación para el sector AECO en España (arquitectura, ingeniería, construcción y operaciones). Este repositorio contiene el kit de herramientas de código abierto: un servidor MCP para asistentes de IA, un SDK en TypeScript, ejemplos de uso de la API y skills reutilizables para IA.

## Servidor MCP

Normatia proporciona un servidor MCP remoto que da a los asistentes de IA acceso a datos del código técnico español, inteligencia de localización, verificación de cumplimiento y consultas normativas en lenguaje natural — sin instalación necesaria.

```
https://mcp.normatia.com/mcp
```

### Herramientas disponibles

| Herramienta | Descripción |
| --- | --- |
| `search_locations` | Buscar localizaciones geográficas españolas (municipios, provincias, comunidades autónomas) |
| `get_location` | Obtener detalle de localización con zona climática, datos sísmicos y normativa aplicable |
| `search_codes` | Buscar códigos y normativas de edificación por tema, ámbito o etiqueta |
| `get_code` | Obtener información detallada de un código de edificación específico |
| `get_code_latest` | Obtener la última versión activa de un código |
| `get_code_version` | Obtener una versión específica con índice de secciones |
| `verify_compliance` | Verificar si un valor técnico cumple con la normativa para una localización |
| `ask` | Realizar preguntas en lenguaje natural sobre normativa de edificación española |

### Configuración

#### Requisitos previos

Obtén una clave API en [normatia.com/api](https://normatia.com/api). Las claves usan el formato `sk-normatia-...`.

#### Claude Desktop

Añade a tu configuración (`~/Library/Application Support/Claude/claude_desktop_config.json` en macOS, `%APPDATA%\Claude\claude_desktop_config.json` en Windows):

```json
{
	"mcpServers": {
		"normatia": {
			"type": "streamable-http",
			"url": "https://mcp.normatia.com/mcp",
			"headers": {
				"Authorization": "Bearer sk-normatia-..."
			}
		}
	}
}
```

#### Claude Code

```bash
claude mcp add normatia --transport streamable-http https://mcp.normatia.com/mcp \
	-h "Authorization: Bearer sk-normatia-..."
```

#### VS Code / GitHub Copilot

Añade a `.vscode/mcp.json` en tu workspace:

```json
{
	"servers": {
		"normatia": {
			"type": "streamable-http",
			"url": "https://mcp.normatia.com/mcp",
			"headers": {
				"Authorization": "Bearer sk-normatia-..."
			}
		}
	}
}
```

O añade a tus Ajustes de Usuario (JSON) para acceso global:

```json
{
	"mcp": {
		"servers": {
			"normatia": {
				"type": "streamable-http",
				"url": "https://mcp.normatia.com/mcp",
				"headers": {
					"Authorization": "Bearer sk-normatia-..."
				}
			}
		}
	}
}
```

#### Cursor

Añade a la configuración MCP de Cursor (`~/.cursor/mcp.json`):

```json
{
	"mcpServers": {
		"normatia": {
			"type": "streamable-http",
			"url": "https://mcp.normatia.com/mcp",
			"headers": {
				"Authorization": "Bearer sk-normatia-..."
			}
		}
	}
}
```

#### Windsurf

Añade a la configuración MCP de Windsurf:

```json
{
	"mcpServers": {
		"normatia": {
			"type": "streamable-http",
			"url": "https://mcp.normatia.com/mcp",
			"headers": {
				"Authorization": "Bearer sk-normatia-..."
			}
		}
	}
}
```

#### Zed

Añade a la configuración de Zed (`~/.config/zed/settings.json`):

```json
{
	"context_servers": {
		"normatia": {
			"transport": "streamable-http",
			"url": "https://mcp.normatia.com/mcp",
			"headers": {
				"Authorization": "Bearer sk-normatia-..."
			}
		}
	}
}
```

#### Cualquier cliente MCP

Usa estos datos de conexión con cualquier cliente compatible con MCP:

| Ajuste | Valor |
| --- | --- |
| Transporte | `streamable-http` |
| URL | `https://mcp.normatia.com/mcp` |
| Cabecera de autenticación | `Authorization: Bearer sk-normatia-...` |

Para instrucciones de configuración completas para más de 30 clientes MCP, consulta [docs.normatia.com/mcp](https://docs.normatia.com/mcp).

### Ejemplos de prompts

Una vez conectado, prueba estos prompts en tu asistente de IA:

- "Busca municipios con nombre Sevilla"
- "¿Cuál es la zona climática de Madrid?"
- "¿Cuáles son los requisitos de resistencia al fuego para edificios residenciales?"
- "Verifica si un muro con U-value 0.35 W/m²K cumple en Sevilla"
- "Muéstrame la última versión del CTE DB-HE"

## Configuraciones MCP

La carpeta [mcp](mcp) contiene configuraciones listas para copiar y usar en los principales clientes MCP compatibles.

## SDK de TypeScript

```bash
npm install normatia
```

```typescript
import { NormatiaClient } from 'normatia';

const client = new NormatiaClient({ apiKey: 'sk-normatia-...' });
const location = await client.getLocation('ES-41091');
console.log(location.tech_data.climate_zone); // "B4"
```

Consulta [packages/sdk-typescript/README.md](packages/sdk-typescript/README.md) para la documentación completa.

## Ejemplos

| Directorio | Descripción |
| --- | --- |
| [examples/curl](examples/curl) | Ejemplos con cURL para los principales endpoints de la API |
| [examples/python](examples/python) | Ejemplos en Python usando `httpx` |
| [examples/typescript](examples/typescript) | Ejemplos en TypeScript usando el SDK |

## Skills para IA

El directorio [skills](skills) contiene prompts de sistema reutilizables para agentes de IA que trabajan con Normatia:

- **Códigos de edificación** — Navegación experta de la normativa española (CTE, RITE, LOE)
- **Cumplimiento** — Flujos de trabajo estructurados para verificación normativa
- **Contexto geográfico** — Orientación normativa con contexto geográfico

## Resumen de la API

| Endpoint | Método | Descripción |
| --- | --- | --- |
| `/api/v1/location/search` | GET | Buscar localizaciones geográficas |
| `/api/v1/location/{geo_id}` | GET | Obtener detalle de localización + datos climáticos |
| `/api/v1/codes/search` | GET | Buscar códigos de edificación |
| `/api/v1/codes/{slug}` | GET | Obtener detalle de un código |
| `/api/v1/codes/{slug}/versions` | GET | Listar versiones de un código |
| `/api/v1/codes/{slug}/versions/{version}` | GET | Obtener detalle de versión + secciones |
| `/api/v1/ask` | POST | Consultas normativas con IA |
| `/api/v1/verify` | POST | Verificación de cumplimiento |

## Documentación

Referencia completa de la API, MCP y guías de integración en [docs.normatia.com](https://docs.normatia.com).

## Contribuir

Las contribuciones son bienvenidas. Por favor, lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir un issue o pull request.

## Licencia

MIT — ver [LICENSE](LICENSE).
