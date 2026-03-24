# Card Game 29

A full-stack multiplayer web app for the classic South Asian card game 29.

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Zustand, Socket.io-client
- **Backend**: Node.js, Express, Socket.io, Prisma ORM
- **Database**: PostgreSQL

## Project Structure

```
card-game-29/
├── client/          # Next.js frontend (port 3000)
│   ├── app/         # Pages: /, /auth, /lobby, /game/[roomId]
│   ├── components/  # PlayingCard, BidModal, TrumpModal, PlayerSlot, ScoreBoard, ChatPanel
│   └── lib/         # socket.ts, api.ts, store.ts, types.ts
└── server/          # Express + Socket.io backend (port 3001)
    ├── prisma/      # schema.prisma
    └── src/
        ├── game/    # Game engine (deck.ts, engine.ts)
        ├── routes/  # auth.ts
        ├── socket/  # index.ts, lobby.ts, game.ts
        └── middleware/
```

## Setup

### 1. Install dependencies

```bash
npm install
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment

```bash
cp .env.example server/.env
# Edit server/.env with your PostgreSQL URL and a JWT_SECRET
```

### 3. Set up the database

```bash
cd server
npm run db:push     # push schema to DB (for dev)
# or
npm run db:migrate  # create migration files
```

### 4. Run in development

From the root:
```bash
npm run dev
```

Or separately:
```bash
npm run server   # starts Express on :3001
npm run client   # starts Next.js on :3000
```

## Game Rules

Card Game 29 is a trick-taking game for 4 players (2 teams).

- **Cards**: 32 cards (7, 8, 9, 10, J, Q, K, A of all 4 suits)
- **Card ranking**: J (3pts) > 9 (2pts) > A (1pt) > 10 (1pt) > K > Q > 8 > 7
- **Total points per round**: 28 + 1 (last trick) = 29
- **Bidding**: 16–28. Highest bidder picks trump suit (kept secret!)
- **Trump**: Revealed only when first played. Until then, only the bidder knows.
- **Win condition**: First team to win 6 rounds wins the match.

## Features

- Account registration + login + guest play (anonymous)
- Customizable display name
- Public room browser + private rooms (join by 6-character code)
- Quick matchmaking (join a queue, get matched with 3 random players)
- Full 29 game logic: bidding, secret trump, trick-taking, scoring
- In-game chat
- Real-time via Socket.io
