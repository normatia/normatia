"""Configuration for the MCP server process."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class MCPSettings(BaseSettings):
    """Environment-driven settings for the MCP server."""

    normatia_api_base_url: str = "https://api.normatia.com"
    normatia_api_key: str

    model_config = SettingsConfigDict(env_file=".env")


@lru_cache()
def get_mcp_settings() -> MCPSettings:
    """Return a cached singleton settings instance."""
    return MCPSettings()