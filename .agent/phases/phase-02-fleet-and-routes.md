# Phase 2: Fleet, Route & Schedule Management

## Objective
Enable bus operators to configure vehicle fleets, seat capacities (2-2, 1-2, Sleeper), route stops, and generate concrete daily trips.

---

## Actionable Execution Chunks

### Chunk 2.1: Bus Capacities & Seat Layout Matrices
- **Tasks**:
  1. Implement CRUD for `bus_capacities`:
     - 28-Seat Business Class (2-1 layout).
     - 36-Seat Economy Class (2-2 layout).
     - 24-Bed Sleeper Class (Upper/Lower berth).
  2. Implement coordinate and seat numbering validator (e.g. `["A1", "A2", "", "A3", "A4"]`).
- **TDD Test**: Validate seat matrix parser generates correct adjacent seat IDs and aisle spacing.
- **DoD**: Admin and vendors can create reusable seat layout templates.

### Chunk 2.2: Fleet & Driver Roster Management
- **Tasks**:
  1. CRUD for `bus_operators`, `buses`, and `drivers`.
  2. Bus asset verification (Reg No, fitness expiration, AC type).
  3. Driver profile, license validation, and assignment to specific operator.
- **DoD**: Operators can register and inspect their vehicles and assign drivers.

### Chunk 2.3: Routes, Stops & Trip Timetable Generator
- **Tasks**:
  1. Create `routes` and sequential `route_stops` with travel time offsets.
  2. Create recurring `trip_schedules` templates (e.g. Daily 08:00 AM, Base Fare 1200 BDT).
  3. Create an automated job or endpoint to generate concrete `trips` for a 30-day rolling window.
- **DoD**: Daily trips appear in the schedule database with correct dates and statuses.

