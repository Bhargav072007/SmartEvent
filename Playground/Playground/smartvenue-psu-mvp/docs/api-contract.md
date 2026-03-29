# API Contract

## POST /auth/mock-login

Request:

```json
{
  "email": "fan@psu.edu",
  "name": "Alex Student"
}
```

Response:

```json
{
  "user_id": "user-001",
  "name": "Alex Student",
  "email": "fan@psu.edu"
}
```

## GET /games/upcoming

Response:

```json
{
  "game_id": "game-psu-michigan-2026",
  "title": "Penn State vs Michigan",
  "venue": "Beaver Stadium",
  "kickoff": "2026-10-17T19:30:00",
  "home_team": "Penn State",
  "away_team": "Michigan"
}
```

## GET /tickets/me?user_id=user-001

Response:

```json
{
  "tickets": [
    {
      "ticket_id": "ticket-valid-001",
      "game_id": "game-psu-michigan-2026",
      "seat": "Section WE, Row 7, Seat 18",
      "gate": "Gate A",
      "status": "active",
      "token": "PSU-VALID-001"
    }
  ]
}
```

## POST /tickets/issue-demo

Request:

```json
{
  "user_id": "user-001",
  "scenario": "valid"
}
```

Response:

```json
{
  "ticket_id": "ticket-valid-001",
  "token": "PSU-VALID-001",
  "status": "active"
}
```

## POST /tickets/validate-scan

Request:

```json
{
  "token": "PSU-VALID-001",
  "gate_id": "Gate A",
  "device_id": "pi-gate-a-01"
}
```

Response:

```json
{
  "result": "VERIFIED",
  "message": "Entry approved. Proceed to Beaver Stadium gate.",
  "ticket_id": "ticket-valid-001",
  "gate_id": "Gate A",
  "scanned_at": "2026-10-17T19:04:12",
  "allowed": true,
  "display_text": "Entry Verified"
}
```

## GET /tickets/status/{ticketId}

Response:

```json
{
  "ticket_id": "ticket-valid-001",
  "status": "used",
  "last_result": "VERIFIED",
  "last_gate": "Gate A",
  "last_scanned_at": "2026-10-17T19:04:12",
  "seat": "Section WE, Row 7, Seat 18",
  "gate": "Gate A"
}
```

## GET /health

Response:

```json
{
  "status": "ok"
}
```
