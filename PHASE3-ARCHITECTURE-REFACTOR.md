# Phase 3: Architecture Refactor - Hexagonal Inbound Port & Background Queue

**Commit**: `0a27e89` - "Phase 3: Implement Hexagonal Architecture - RestControllerPort & Background Job Queue"  
**Date**: May 23, 2026  
**Status**: ✅ Architecture Refactored | ⚠️ Requires Redis for Full Functionality

---

## What Was Implemented

### 1. Inbound Port (Application Use Case)

**File**: `packages/comic-generation/src/application/use-cases/ComicGenerationUseCase.ts`

Implements the `RestControllerPort` interface to coordinate:
- Project creation and persistence
- Background job enqueueing
- Project retrieval and listing
- HITL feedback submission

The use case is now the **single point of entry** for all comic generation operations. The Express API no longer directly instantiates infrastructure adapters.

```typescript
class ComicGenerationUseCase implements RestControllerPort {
  constructor(
    private readonly projectRepo: RelationalDbPort,
    private readonly taskQueue: JobQueuePort
  ) {}
  
  async createProject(prompt, panelCount) {
    const projectId = randomUUID();
    const project = { id: projectId, prompt, panelCount, ... };
    await this.projectRepo.save(project);
    await this.taskQueue.add("start-comic", { projectId });
    return projectId;
  }
}
```

### 2. Abstracted Job Queue Port

**File**: `packages/comic-generation/src/application/ports/out/job-queue.out-port.ts`

Defined `JobQueuePort` interface to abstract job queue implementation:
```typescript
interface JobQueuePort {
  add(jobName: string, data: any, options?: any): Promise<void>;
}
```

This allows the application layer to remain agnostic of BullMQ. Any job queue technology (RabbitMQ, AWS SQS, etc.) can implement this port.

**Concrete Implementation**: `apps/api/src/adapters/BullMQJobQueueAdapter.ts`

Wraps BullMQ Queue and implements JobQueuePort with sensible defaults:
- Auto-retry: 3 attempts
- Backoff: Exponential (2000ms * 2^attempt)
- Cleanup: Remove completed jobs

### 3. Background Worker

**File**: `apps/api/src/workers/comic-worker.ts`

BullMQ Worker processes two job types:

#### **"start-comic" Job**
1. Loads project from database
2. Invokes LangGraph workflow with initial state
3. Graph runs until first HITL interrupt (after first panel generation)
4. Updates project status to "pending_review"
5. Returns control to queue

#### **"resume-comic" Job**
1. Loads project from database
2. Retrieves graph state using threadId
3. Resumes graph with human feedback (approved/rejected/comment)
4. If approved: generates next panel, returns to HITL interrupt
5. If rejected: regenerates current panel with feedback
6. If all panels complete: updates status to "completed"

### 4. Enhanced Port Definitions

**RelationalDbPort** (`packages/comic-generation/src/application/ports/out/relational-db.out-port.ts`):
```typescript
interface RelationalDbPort {
  save(project: any): Promise<void>;
  load(id: string): Promise<any | null>;
  listAll(): Promise<any[]>;
}
```

Concrete implementation for demo: `InMemoryProjectRepository` in API layer.  
For production: Replace with PostgreSQL adapter.

### 5. Refactored Express API

**File**: `apps/api/src/index.ts`

- Removed direct `LangGraphOrchestrationAdapter` instantiation
- All endpoints now delegate to `ComicGenerationUseCase`
- Clean separation of concerns:
  - API layer: HTTP parsing, validation, response
  - Application layer: Business logic, orchestration
  - Infrastructure layer: Database, job queue, LLM orchestration

```typescript
app.post("/api/projects", async (req, res, next) => {
  const projectId = await comicUseCase.createProject(prompt, panelCount);
  // Use case handles: validation → persistence → job queueing
  res.status(201).json({ id: projectId, status: "created" });
});
```

---

## Architecture Flow

```
┌─────────────────────────────────────┐
│     Express API (Primary Adapter)   │
│  Input Validation │ HTTP Response   │
└──────────────┬──────────────────────┘
               │ delegates to
┌──────────────▼──────────────────────┐
│  RestControllerPort (Inbound Port)  │
│   ComicGenerationUseCase            │
│   - createProject()                 │
│   - getProject()                    │
│   - submitReview()                  │
└──────────────┬──────────────────────┘
               │ depends on
        ┌──────┴──────┐
        │             │
┌───────▼──────┐  ┌──▼──────────────┐
│RelationalDb  │  │JobQueue        │
│Port (Out)    │  │Port (Out)      │
└───────┬──────┘  └──┬──────────────┘
        │           │
  ┌─────▼──────┐  ┌─▼──────────────┐
  │InMemory    │  │BullMQ          │
  │Repo        │  │JobQueueAdapter │
  │(Demo)      │  │                │
  └────────────┘  └─┬──────────────┘
                    │
            ┌───────▼───────┐
            │  Redis Queue  │
            │  (Background) │
            └───────┬───────┘
                    │
        ┌───────────▼────────────┐
        │  BullMQ Worker Process │
        │  (Async Job Handler)   │
        └───────────┬────────────┘
                    │
     ┌──────────────▼──────────────┐
     │  LangGraphOrchestrationAd.  │
     │  - structureStory()         │
     │  - buildCharacterBible()    │
     │  - generatePanel()          │
     │  - hitlReview()             │
     └────────────────────────────┘
```

---

## Type Safety & Ports

### Clear Boundaries

| Layer | Responsibility | Knows About |
|-------|------------------|-------------|
| **API** | HTTP routing, validation | RestControllerPort only |
| **Application** | Orchestration logic | JobQueuePort, RelationalDbPort, domain entities |
| **Infrastructure** | External systems | BullMQ, LangGraph, database drivers |

### Hexagonal Benefits

1. **Testability**: Mock ports for unit tests
2. **Flexibility**: Swap job queue technology without changing application code
3. **Scalability**: Background workers can run on separate machines
4. **Maintainability**: Clear contracts between layers

---

## Running the System

### Prerequisites

```bash
# Start Redis (required for BullMQ)
docker run -p 6379:6379 redis:latest

# Or if Redis is already installed:
redis-server
```

### Start API & Worker

```bash
# Build all packages
yarn build

# Start API server (includes worker initialization)
cd apps/api
PANELCRAFT_DEBUG=true yarn dev
```

The worker automatically initializes when the API starts and listens for jobs.

### Full Workflow Example

```bash
# 1. Create project (enqueues "start-comic" job)
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A superhero saves the city", "panelCount": 3}'

# Response: { "id": "abc123", "status": "created" }

# 2. Watch background worker process the job
# [Worker] Starting comic generation for project: abc123
# [structureStory Output] ["Panel 1: ...", "Panel 2: ...", "Panel 3: ..."]
# [buildCharacterBible Output] { "characters": [...] }
# [Worker] First panel generated. Waiting for HITL review.

# 3. Check project status
curl http://localhost:3001/api/projects/abc123

# Response: { "status": "pending_review", "panels": [...] }

# 4. Submit HITL feedback (enqueues "resume-comic" job)
curl -X POST http://localhost:3001/api/projects/abc123/review \
  -H "Content-Type: application/json" \
  -d '{"approved": true, "comment": "Colors look good"}'

# 5. Watch worker resume and continue generation
# [Worker] Resuming workflow for project abc123
# [generatePanel] Panel 2 image URL
# [Worker] Waiting for HITL review (2/3)

# 6. Repeat step 4 for remaining panels until completion
# [Worker] Comic generation completed for project abc123
```

---

## Thread ID & State Persistence

The workflow uses `threadId` matching `projectId` for LangGraph state persistence:

```typescript
await graph.invoke(
  { project, currentPanelIndex: 0, ... },
  { configurable: { thread_id: projectId } }  // ← Thread ID matches project ID
);
```

This allows the worker to:
- Resume from exact interruption point
- Access all previous state (panels, character bible)
- Maintain consistent workflow across job retries

For production, replace `MemorySaver` checkpointer with database-backed option (PostgreSQL).

---

## Production Checklist

### Still Required

- [ ] **Database Persistence** - Replace InMemoryProjectRepository with real DB (PostgreSQL)
- [ ] **Persistent Checkpointer** - Replace MemorySaver with SqliteSaver or DB adapter
- [ ] **HITL Feedback Loop** - Integrate feedback comment into panel regeneration prompt
- [ ] **Error Handling** - Add retry logic for failed jobs, dead letter queues
- [ ] **Monitoring** - BullMQ UI, job status dashboards, worker health checks
- [ ] **Scaling** - Run workers on separate machines, auto-scaling groups
- [ ] **Testing** - Integration tests for job queue, worker, HITL resumption

### Not Blocking Demo

- Error recovery from failed LLM calls
- Long-running workflow optimization
- Cost tracking for API calls
- Cleanup of old completed projects

---

## Next Steps

### Immediate (For Full Demo)

1. **Install Redis** (required for worker)
2. **Test Full Workflow** - Create project, review panel, submit feedback
3. **Verify HITL Loop** - Ensure feedback affects regeneration

### Short-term (For Stability)

1. Implement PostgreSQL adapter for RelationalDbPort
2. Add database-backed checkpointer for LangGraph
3. Integrate feedback comment into regeneration prompts
4. Add worker error handling and dead letter queues

### Medium-term (For Production)

1. Implement monitoring dashboard for job queue
2. Add distributed tracing (LangSmith + job IDs)
3. Set up auto-scaling for workers
4. Add comprehensive error recovery

---

## Files Changed This Sprint

### New Files
- `packages/comic-generation/src/application/ports/out/job-queue.out-port.ts`
- `packages/comic-generation/src/application/use-cases/ComicGenerationUseCase.ts`
- `packages/comic-generation/src/application/use-cases/index.ts`
- `apps/api/src/adapters/BullMQJobQueueAdapter.ts`
- `apps/api/src/workers/comic-worker.ts`

### Modified Files
- `packages/comic-generation/src/application/index.ts` - Added use-case export
- `packages/comic-generation/src/application/ports/out/index.ts` - Added job-queue export
- `packages/comic-generation/src/application/ports/out/relational-db.out-port.ts` - Defined port methods
- `apps/api/src/index.ts` - Refactored to use use case
- `apps/api/package.json` - Added bullmq, redis dependencies

---

## Verification

- ✅ TypeScript: All 5 packages compile without errors
- ✅ Architecture: Clear hexagonal boundaries established
- ✅ Async Execution: Background worker infrastructure ready
- ✅ State Persistence: Thread ID mapping prepared
- ⚠️ Demo Readiness: Requires Redis to run full workflow

**Branch**: `feature/llm-story-structuring`  
**Commits Completed**: 2 (critical fixes + architecture refactor)  
**Ready for Demo**: Yes (with Redis running)  
**Production Ready**: No (database + error handling required)
