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

Normatia proporciona un servidor MCP remoto que da a los asistentes de IA acceso a la normativa de edificación española **en el contexto de un proyecto concreto** — sin instalación necesaria.

```
https://mcp.normatia.com/mcp
```

### Todo gira alrededor de un proyecto

El alcance normativo de Normatia **se define por proyecto**: cada proyecto en normatia.com tiene su municipio, sus normativas aplicables (estatales, autonómicas, municipales), sus documentos subidos, su memoria de datos de obra y sus cálculos guardados.

Eso significa que el asistente nunca tiene que preguntar por la ciudad, la zona climática ni qué edición del CTE aplica: la respuesta llega con esos valores ya resueltos. Y un municipio sin proyecto no tiene respuesta: el servidor lo dice y sugiere crearlo, porque las ordenanzas municipales difieren por completo entre ayuntamientos.

### Herramientas disponibles

Tres herramientas, todas de **solo lectura**. El servidor MCP no escribe nada en tus proyectos.

| Herramienta | Descripción | Coste |
| --- | --- | --- |
| `ask(query, project_id?)` | Consulta en lenguaje natural sobre la normativa que aplica a un proyecto. Es la única que devuelve texto normativo citable. | 1 crédito |
| `get_project_info(project_id?)` | Contexto completo del proyecto: ubicación, datos técnicos del territorio, normativa aplicable con su versión vigente, archivos, documentos generados, memoria y cálculos. | Gratis |
| `list_projects()` | Proyectos que el usuario puede consultar, con su `project_id`, ubicación y cuál es el activo. | Gratis |

`ask` ejecuta **el mismo bucle agéntico que el chat de normatia.com**, no una búsqueda de un solo disparo: encadena varias búsquedas, lee la memoria y los cálculos guardados del proyecto, consulta los documentos subidos y cita cada fuente con marcadores `[N]` validados. Como la llamada es síncrona trabaja con presupuestos más cortos — 6 rondas de razonamiento, 6 búsquedas, 120 segundos — así que configura el timeout de tu cliente en 150 segundos o más.

Todas las herramientas aceptan un `project_id` opcional, que se resuelve como `project_id explícito → proyecto activo del usuario`. Para preguntar por otro municipio, llama a `list_projects()` y pasa el identificador que corresponda: se pueden consultar varios proyectos en la misma conversación, y el proyecto activo del usuario en la web no cambia por debajo.

### Configuración

#### Claude

Conecta Normatia a [claude.ai](https://claude.ai) como conector personalizado.

**Planes Free, Pro y Max:**

1. Ve a [Customize > Connectors](https://claude.ai/customize/connectors)
2. Haz clic en "+" y luego en "Add custom connector"
3. Introduce la URL del servidor: `https://mcp.normatia.com/mcp`
4. En autenticación selecciona `OAuth`
5. Haz clic en "Add"

**Planes Team y Enterprise (propietario):**

1. Ve a [Organization settings > Connectors](https://claude.ai/admin-settings/connectors)
2. Haz clic en "Add" → pasa el cursor sobre "Custom" → selecciona "Web"
3. Introduce la URL del servidor: `https://mcp.normatia.com/mcp`
4. En autenticación selecciona `OAuth`
5. Haz clic en "Add"

Una vez que el propietario lo haya añadido, los miembros se conectan desde [Customize > Connectors](https://claude.ai/customize/connectors).

Tras la configuración, activa Normatia en cada conversación mediante el botón "+" en la parte inferior izquierda → "Connectors".

#### ChatGPT

Conecta Normatia a [ChatGPT](https://chatgpt.com) como app MCP personalizada. Disponible en los planes Free, Plus, Pro, Business y Enterprise/Edu. Actualmente en beta.

1. Activa el modo desarrollador: ve a Settings → Apps → Advanced Settings y activa **Developer mode**
2. Ve a Settings → Apps → **Create**
3. Introduce la URL del servidor: `https://mcp.normatia.com/mcp`
4. En autenticación selecciona `OAuth`
5. Haz clic en **Create**

Una vez creada, activa la app en cualquier conversación mediante el botón "+" y selecciona Normatia.

#### Requisitos previos

Las siguientes herramientas requieren una clave API. Obtén una en [normatia.com/es/api](https://normatia.com/es/api). Las claves usan el formato `sk-normatia-...`.

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

- "¿Qué normativa tengo activa en mi proyecto y de qué año es cada edición?"
- "¿Qué transmitancia máxima puedo poner en las ventanas de mi proyecto?"
- "Revisa la memoria de carpintería adjunta y dime si los valores cumplen"
- "¿Qué altura libre mínima me exige la ordenanza municipal en el proyecto de Sevilla?"
- "Compara los requisitos de accesibilidad de mi proyecto de Madrid con el de Bilbao"
- "¿Qué dice la normativa sobre ventilación del garaje, teniendo en cuenta los cálculos que ya guardé?"

## Configuraciones MCP

La carpeta [mcp](mcp) contiene configuraciones listas para copiar y usar en los principales clientes MCP compatibles.

## SDK de TypeScript

```bash
npm install normatia
```

```typescript
import { NormatiaClient } from 'normatia';

const client = new NormatiaClient({ apiKey: 'sk-normatia-...' });
const results = await client.searchLocations({ q: 'Sevilla' });
console.log(results[0].geo_id); // "ES-41091"
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
| `/api/v1/projects` | GET | Listar los proyectos que el usuario puede consultar |
| `/api/v1/project/info` | GET | Contexto completo de un proyecto |
| `/api/v2/ask` | POST | Consulta normativa agéntica sobre un proyecto |
| `/api/v1/verify` | POST | Verificación de cumplimiento |

`POST /api/v1/ask` (el antiguo endpoint RAG de un solo disparo) está congelado y oculto del esquema público. Sigue funcionando para las integraciones existentes, pero las nuevas deben usar `/api/v2/ask`.

## Documentación

Referencia completa de la API, MCP y guías de integración en [docs.normatia.com](https://docs.normatia.com).

## Contribuir

Las contribuciones son bienvenidas. Por favor, lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir un issue o pull request.

## Licencia

MIT — ver [LICENSE](LICENSE).
