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

Normatia es una plataforma de cumplimiento normativo de la edificación para el sector AECO en España (arquitectura, ingeniería, construcción y operaciones). Este repositorio contiene el kit de herramientas de código abierto: un servidor MCP para asistentes de IA, los SDK de TypeScript y de Python, ejemplos de uso de la API y skills reutilizables para IA.

## Servidor MCP

Normatia proporciona un servidor MCP remoto que da a los asistentes de IA la API de Normatia, sin instalar nada:
las parcelas catastrales con sus afecciones y su planeamiento, los municipios con sus datos técnicos, el texto de la
normativa de edificación española y un motor agéntico que la interpreta citando sus fuentes.

```
https://mcp.normatia.com/mcp/
```

### Herramientas disponibles

Primero los datos: baratos, deterministas y con el mismo JSON que la API REST (`structuredContent` con su
`outputSchema`).

| Herramienta | Descripción | Créditos |
| --- | --- | --- |
| `find_parcel` | La parcela de un punto o de una dirección | 0,1 |
| `get_parcel` | Una parcela por su referencia catastral, con afecciones, planeamiento, edificación, inmuebles y geometría | 1 con afecciones o planeamiento (por defecto), 0,1 sin ellos |
| `get_place` | Un municipio con sus datos técnicos, cada uno con la norma de donde sale | 0,1 |
| `search_regulations`, `get_regulation_contents`, `read_regulation_section` | El catálogo normativo, el índice de una norma y el texto de cada sección | 0,1 |
| `ask` | Una pregunta interpretada por el motor, sobre un proyecto, un municipio (`place`) o una parcela (`parcel`) | 5, nada si falla |
| `get_answer` | Recoge una consulta de `ask` que pasó de 45 segundos | Gratis |
| `list_projects`, `get_project_info`, `get_usage` | Los proyectos del usuario, y el consumo y el saldo de la organización | Gratis |

Las herramientas se pagan con los créditos de la organización del usuario, y solo cuando salen bien. En el plan Team
no se descuenta nada. Sin créditos suficientes, la herramienta responde con un error que lo dice, y no se cobra nada.

`ask` ejecuta **el mismo bucle agéntico que el chat de normatia.com** y cita cada fuente con marcadores `[N]`
validados. Espera como mucho 45 segundos; si el motor no ha terminado, devuelve un `id` que recoge `get_answer`, así
que ningún cliente corta por tiempo. Todas son de solo lectura salvo `ask`, que guarda su conversación. La guía
completa: [docs.normatia.com/mcp](https://docs.normatia.com/mcp/).

### Configuración

| Ajuste | Valor |
| --- | --- |
| URL | `https://mcp.normatia.com/mcp/` |
| Transporte | Streamable HTTP (`http` en la mayoría de los clientes) |
| Autenticación | OAuth, o una clave de API en `Authorization: Bearer sk-normatia-...` |

Todas las organizaciones tienen la API y el MCP activados. Con OAuth, el cliente te lleva a iniciar sesión en Normatia y obtiene el acceso por ti. Para los clientes sin OAuth, crea una clave en normatia.com, en [Mi cuenta](https://normatia.com/es/area-usuario/cuenta) (apartado «Claves API»).

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

## SDK de Python

```bash
pip install normatia
```

```python
from normatia import Normatia

client = Normatia()  # lee NORMATIA_API_KEY
place = client.get_place("ES-41091")  # Sevilla
print(place["technical_data"]["climate_zone"]["value"])  # "B4"
```

Consulta [packages/sdk-python/README.md](packages/sdk-python/README.md) para la documentación completa.

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
| `/v1/parcels`, `/v1/parcels/{ref}` | GET | Parcelas por un punto, una dirección o su referencia catastral, con afecciones y planeamiento |
| `/v1/addresses` | GET | Autocompletar direcciones |
| `/v1/places`, `/v1/places/{place}` | GET | Municipios y sus datos técnicos |
| `/v1/regulations`, `/v1/regulations/{slug}/contents`, `/v1/regulations/{slug}/sections/{section}` | GET | El catálogo normativo y el texto de cada sección |
| `/v1/layers`, `/v1/coverage`, `/v1/sandbox` | GET | Las capas de afección, lo que hay cargado en un municipio y el entorno de pruebas |
| `/v1/me`, `/v1/usage`, `/v1/keys` | GET | La clave, el consumo, el saldo de créditos y las claves |
| `/api/v1/location/search` | GET | Buscar territorios por nombre |
| `/api/v1/location/{geo_id}` | GET | Detalle de un territorio: ancestros, datos técnicos y normativas aplicables |
| `/api/v1/codes/search` | GET | Buscar en el catálogo normativo |
| `/api/v1/codes/{slug}` | GET | Detalle de una normativa con todas sus versiones |
| `/api/v1/codes/{slug}/latest` | GET | Versiones vigentes |
| `/api/v1/codes/{slug}/{version}` | GET | Una versión con su índice de secciones (títulos, sin texto) |
| `/api/v1/projects` | GET | Listar los proyectos que el usuario puede consultar |
| `/api/v1/project/info` | GET | Contexto completo de un proyecto |
| `/api/v2/ask` | POST | Consulta normativa agéntica sobre un proyecto |

Todas las llamadas llevan `Authorization: Bearer sk-normatia-...` y se pagan con los créditos de la organización, solo cuando salen bien. `/api/v2/ask` cuesta 5; una parcela con afecciones o planeamiento, 1; cualquier otro dato, 0,1. La cuenta, las capas, la cobertura, el entorno de pruebas y los proyectos son gratis. Sin créditos suficientes, la API responde `402 insufficient_credits`. Los errores de `/v1` son problemas RFC 9457 con su `code`; las rutas anteriores responden `{"detail": {"error": "<código>", "message": "..."}}`. Los códigos y los límites están en [docs.normatia.com/api-reference/authentication](https://docs.normatia.com/api-reference/authentication/).

`POST /api/v1/ask` y `POST /api/v1/verify` se retiraron el 21 de noviembre de 2026 y responden `410 endpoint_retired`: usa `/api/v2/ask`.

## Documentación

Referencia completa de la API, MCP y guías de integración en [docs.normatia.com](https://docs.normatia.com).

## Contribuir

Las contribuciones son bienvenidas. Por favor, lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir un issue o pull request.

## Licencia

MIT, ver [LICENSE](LICENSE).
