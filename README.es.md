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

Normatia proporciona un servidor MCP remoto que da a los asistentes de IA acceso a la normativa de edificación española **en el contexto de un proyecto concreto**, sin instalar nada.

```
https://mcp.normatia.com/mcp/
```

### Todo gira alrededor de un proyecto

El alcance normativo de Normatia **se define por proyecto**: cada proyecto en normatia.com tiene su municipio, sus normativas aplicables (estatales, autonómicas, municipales), sus documentos subidos, su memoria de datos de obra y sus cálculos guardados.

Eso significa que el asistente nunca tiene que preguntar por la ciudad, la zona climática ni qué edición del CTE aplica: la respuesta llega con esos valores ya resueltos. Y un municipio sin proyecto no tiene respuesta: el asistente debe decirlo y sugerir crearlo, porque las ordenanzas municipales difieren por completo entre ayuntamientos.

### Herramientas disponibles

Tres herramientas, todas de **solo lectura**. El servidor MCP no escribe nada en tus proyectos.

| Herramienta | Descripción | Coste |
| --- | --- | --- |
| `ask(query, project_id?)` | Consulta en lenguaje natural sobre la normativa que aplica a un proyecto. Es la única que devuelve texto normativo citable. | 1 crédito |
| `get_project_info(project_id?)` | Contexto completo del proyecto: ubicación, datos técnicos del territorio, normativa aplicable con su versión vigente, archivos, documentos generados, memoria y cálculos. | Gratis |
| `list_projects()` | Proyectos que el usuario puede consultar, con su `project_id`, ubicación y cuál es el activo. | Gratis |

`ask` ejecuta **el mismo bucle agéntico que el chat de normatia.com**, no una búsqueda de un solo disparo: encadena varias búsquedas, lee la memoria y los cálculos guardados del proyecto, consulta los documentos subidos y cita cada fuente con marcadores `[N]` validados. Como la llamada es síncrona trabaja con presupuestos más cortos (6 rondas de razonamiento, 6 búsquedas, 120 segundos), así que configura el tiempo máximo de tu cliente en 150 segundos o más.

Todas las herramientas aceptan un `project_id` opcional, que se resuelve como `project_id explícito → proyecto activo del usuario`. Para preguntar por otro municipio, llama a `list_projects()` y pasa el identificador que corresponda: se pueden consultar varios proyectos en la misma conversación, y el proyecto activo del usuario en la web no cambia por debajo.

### Configuración

| Ajuste | Valor |
| --- | --- |
| URL | `https://mcp.normatia.com/mcp/` |
| Transporte | Streamable HTTP (`http` en la mayoría de los clientes) |
| Autenticación | OAuth, o una clave de API en `Authorization: Bearer sk-normatia-...` |

La API y el MCP se activan por organización, cada uno por su lado: escribe a hola@normatia.com para activarlos. Con OAuth, el cliente te lleva a iniciar sesión en Normatia y obtiene el acceso por ti. Para los clientes sin OAuth, crea una clave en normatia.com, en [Mi cuenta](https://normatia.com/es/area-usuario/cuenta) (apartado «Claves API»).

#### Claude (claude.ai y Claude Desktop)

Los servidores remotos se añaden como **conector personalizado** desde tu cuenta de Claude, no en `claude_desktop_config.json` (ese archivo es solo para servidores locales). El conector que añades en claude.ai aparece también en Claude Desktop.

1. Ve a [Customize > Connectors](https://claude.ai/customize/connectors)
2. Pulsa **+ Add** y luego **Add custom connector**
3. Escribe un nombre y la URL del servidor: `https://mcp.normatia.com/mcp/`
4. Elige iniciar sesión con OAuth (si te pregunta por el cliente OAuth, elige **Register automatically**), o no iniciar sesión y añadir una cabecera de petición `Authorization: Bearer sk-normatia-...`
5. Pulsa **Add** e inicia sesión en Normatia

En los planes Team y Enterprise, el propietario lo añade desde [Organization settings > Connectors](https://claude.ai/admin-settings/connectors) (**Add**, **Custom**, **Web**) y los miembros lo conectan después desde Customize > Connectors.

#### ChatGPT

1. Activa el modo desarrollador: Settings > Apps > Advanced settings > **Developer mode**
2. Pulsa **Create app**
3. Introduce la URL `https://mcp.normatia.com/mcp/` y elige `OAuth` como autenticación
4. Pulsa **Create** e inicia sesión en Normatia

#### Claude Code

```bash
# OAuth: después, ejecuta /mcp dentro de Claude Code e inicia sesión
claude mcp add --transport http normatia https://mcp.normatia.com/mcp/

# O con clave de API
claude mcp add --transport http normatia https://mcp.normatia.com/mcp/ \
  --header "Authorization: Bearer sk-normatia-..."
```

#### VS Code / GitHub Copilot

Añade a `.vscode/mcp.json` en tu espacio de trabajo (o a la configuración de usuario, con el comando **MCP: Open User Configuration**). VS Code abre el inicio de sesión de Normatia la primera vez que arranca el servidor:

```json
{
  "servers": {
    "normatia": {
      "type": "http",
      "url": "https://mcp.normatia.com/mcp/"
    }
  }
}
```

Para usar una clave, mira [mcp/vscode.json](mcp/vscode.json): VS Code te la pide y la guarda cifrada, fuera del archivo.

#### Cursor

Añade a `~/.cursor/mcp.json` (o a `.cursor/mcp.json` en un proyecto):

```json
{
  "mcpServers": {
    "normatia": {
      "url": "https://mcp.normatia.com/mcp/",
      "headers": {
        "Authorization": "Bearer sk-normatia-..."
      }
    }
  }
}
```

#### Windsurf

Añade a `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "normatia": {
      "serverUrl": "https://mcp.normatia.com/mcp/",
      "headers": {
        "Authorization": "Bearer sk-normatia-..."
      }
    }
  }
}
```

#### OpenCode

Añade a `~/.config/opencode/opencode.json` (o a `opencode.json` en un proyecto). Sin `headers`, OpenCode inicia sesión con OAuth:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "normatia": {
      "type": "remote",
      "url": "https://mcp.normatia.com/mcp/",
      "enabled": true,
      "headers": {
        "Authorization": "Bearer sk-normatia-..."
      }
    }
  }
}
```

#### Zed

Añade a la configuración de Zed (`settings.json`):

```json
{
  "context_servers": {
    "normatia": {
      "url": "https://mcp.normatia.com/mcp/",
      "headers": {
        "Authorization": "Bearer sk-normatia-..."
      }
    }
  }
}
```

Hay archivos listos para copiar y un instalador interactivo en [mcp](mcp). Guía completa: [docs.normatia.com/mcp](https://docs.normatia.com/mcp/).

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
const { results } = await client.searchLocations({ q: 'Sevilla', level: 'municipality' });
console.log(results[0].geo_id); // "ES-41091"
```

Consulta [packages/sdk-typescript/README.md](packages/sdk-typescript/README.md) para la documentación completa.

## Ejemplos

| Directorio | Descripción |
| --- | --- |
| [examples/curl](examples/curl) | Ejemplos con cURL para los principales endpoints de la API |
| [examples/python](examples/python) | Ejemplos en Python usando `httpx` |
| [examples/typescript](examples/typescript) | Ejemplos en TypeScript con `fetch` nativo |

## Skills para IA

El directorio [skills](skills) contiene prompts de sistema reutilizables para agentes de IA que trabajan con Normatia:

- **Códigos de edificación**: navegación experta de la normativa española (CTE, RITE, LOE)
- **Cumplimiento**: flujos de trabajo estructurados para verificación normativa
- **Contexto geográfico**: orientación normativa con contexto geográfico

## Resumen de la API

| Endpoint | Método | Descripción |
| --- | --- | --- |
| `/api/v1/location/search` | GET | Buscar territorios por nombre |
| `/api/v1/location/{geo_id}` | GET | Detalle de un territorio: ancestros, datos técnicos y normativas aplicables |
| `/api/v1/codes/search` | GET | Buscar en el catálogo normativo |
| `/api/v1/codes/{slug}` | GET | Detalle de una normativa con todas sus versiones |
| `/api/v1/codes/{slug}/latest` | GET | Versiones vigentes |
| `/api/v1/codes/{slug}/{version}` | GET | Una versión con su índice de secciones (títulos, sin texto) |
| `/api/v1/projects` | GET | Listar los proyectos que el usuario puede consultar |
| `/api/v1/project/info` | GET | Contexto completo de un proyecto |
| `/api/v2/ask` | POST | Consulta normativa agéntica sobre un proyecto (1 crédito) |
| `/api/v1/verify` | POST | Verificar un parámetro en el municipio del proyecto activo (1 crédito) |

Todas las llamadas llevan `Authorization: Bearer sk-normatia-...`. Los errores llegan como `{"detail": {"error": "<código>", "message": "..."}}`; los códigos, los límites y la cuota están en [docs.normatia.com/api-reference/authentication](https://docs.normatia.com/api-reference/authentication/).

`POST /api/v1/ask` (el antiguo endpoint RAG de un solo disparo) está congelado y oculto del esquema público. Sigue funcionando para las integraciones existentes, pero las nuevas deben usar `/api/v2/ask`.

## Documentación

Referencia completa de la API, MCP y guías de integración en [docs.normatia.com](https://docs.normatia.com).

## Contribuir

Las contribuciones son bienvenidas. Por favor, lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir un issue o pull request.

## Licencia

MIT, ver [LICENSE](LICENSE).
