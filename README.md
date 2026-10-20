# LUMI — Stay Close, From Anywhere

The official LUMI telepresence robot ecosystem monorepo.

## Project Structure

- **[lumi_web](./lumi_web)**: Next.js 15 web application, interactive 3D WebGL robot canvas, pre-order reservation system, and admin dashboard.
- **[lumi_app](./lumi_app)**: React Native / Expo companion controller app with live WebRTC video, two-way audio, and remote robot drive controls.

## Development

### Web Platform (lumi_web)
```bash
cd lumi_web
pnpm install
pnpm dev
```

### Mobile Companion App (lumi_app)
```bash
cd lumi_app
npm install
npx expo start
```
