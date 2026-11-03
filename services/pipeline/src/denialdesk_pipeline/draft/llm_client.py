"""The only module that talks to an LLM. Not built yet.

Every call records the prompt version and model name, and every response is
parsed into a Pydantic model before anything else sees it.
"""
