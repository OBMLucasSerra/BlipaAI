# Bipa.ai — Identificador de Produtos Obramax

App de visão computacional que identifica peças PVC Fortlev a partir de uma foto, usando um modelo Keras treinado (`model/keras_model.h5`).

## Estrutura

- `index.html`, `src/` — front-end (Vite, vanilla JS + Tailwind via CDN).
- `backend/` — API FastAPI que carrega o modelo e expõe `/health` e `/predict`.
- `model/` — modelo treinado (`keras_model.h5`) e classes (`labels.txt`).

## Rodando localmente

### Front-end

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

### Backend (API do modelo)

Requer Python 3.11. No Windows, se o `pip install tensorflow-intel` falhar por causa do limite de caminho longo do Windows, crie o venv em um caminho curto (ex.: `C:\BipaAI-venv`).

```bash
python -m venv .venv
.venv/Scripts/pip install -r backend/requirements.txt
.venv/Scripts/python -m uvicorn backend.main:app --reload --port 8000
```

Por padrão o front-end chama `http://localhost:8000`. Para apontar para outra URL, defina `VITE_API_URL` em um arquivo `.env`.

## Deploy

- **Front-end**: publicado automaticamente no GitHub Pages a cada push em `main` (veja `.github/workflows/deploy-pages.yml`).
- **Backend**: GitHub Pages só serve arquivos estáticos — a API com TensorFlow precisa rodar em outro serviço (Render, Railway, Fly.io, HuggingFace Spaces etc.). Enquanto o backend não estiver publicado, a versão do GitHub Pages mostra "IA OFFLINE" e a captura de fotos não retorna resultado.

## Observação sobre os dados de produto

Os SKUs/EAN por bitola em `src/main.js` são **derivados** do EAN único publicado na ficha técnica Fortlev (a Fortlev não divulga um código distinto por bitola). Substitua pela tabela oficial assim que disponível.
