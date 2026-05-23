# Architecture Notes

- Follow `.architecture/manifest.yaml` as source of truth
- Keep domain pure
- Use ports for all external interactions
- LangGraph lives in comic-generation bounded context
- Image generation is an external service client (swappable)
