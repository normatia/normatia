"""Entry point for running the Normatia MCP server over stdio."""

import logging
import sys

from normatia_mcp.server import mcp


def main() -> None:
    """Run the MCP server over stdio transport."""
    logging.basicConfig(level=logging.INFO, stream=sys.stderr)
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()