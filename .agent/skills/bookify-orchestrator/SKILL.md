---
name: bookify-orchestrator
description: Master orchestration skill for the Bookify platform. Guides agents through SDD, TDD, BDD protocols, microservice coordination, and chunked phase execution.
---

# Bookify Master Orchestrator Skill

Use this skill whenever working on tasks in the Bookify repository, whether creating backend microservices, authoring tests, integrating AI pipelines, or building Next.js/React frontend portals.

## 1. Golden Rules of Development
1. **Always Consult the Blueprint**:
   - High-level architecture: `.agent/architecture/SYSTEM_ARCHITECTURE.md`
   - Database entities (23 tables): `.agent/architecture/DATABASE_SCHEMA.md`
   - DFD pipelines: `.agent/architecture/DATA_FLOW_DFD.md`
   - Sequence diagrams: `.agent/architecture/SEQUENCE_FLOWS.md`
   - REST/WebSocket APIs: `.agent/architecture/API_SPECIFICATION.md`
2. **Follow SDD -> TDD -> BDD Execution Order**:
   - Step 1: Verify the specification in `.agent/sdd/`.
   - Step 2: Write failing unit/integration tests in `.agent/tdd/` or service `test/`.
   - Step 3: Implement minimal clean code to make tests pass.
   - Step 4: Verify against Gherkin scenarios in `.agent/bdd/`.
3. **Execute Work in Phased Chunks**:
   - Check current phase progress in `.agent/phases/MASTER_PHASE_ROADMAP.md`.
   - Work strictly within the active chunk to prevent half-finished migrations or broken builds.

