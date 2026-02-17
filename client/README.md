<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1jXWon2vS4xv69dGa-OBDAkDmshjdUKnR

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
 
## Testes Unitários
 
- Framework: Vitest + React Testing Library
- Onde ficam:
  - components/__tests__
  - hooks/__tests__
- Executar:
  ```
  npm run test
  ```
- Dicas:
  - Os testes rodam em modo watch por padrão.
  - Para reduzir logs, use `-s` (silent):
    ```
    npm run test -s
    ```
