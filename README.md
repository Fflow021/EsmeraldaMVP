# ❇️ Esmeralda: Preceptoria Híbrida e IA Socrática
### O resgate da proficiência médica no Brasil

**Equipe:** Eduardo Chuairi (Produto), Marllon Pereira (IA), Phillipe Wolff (Back-end) e Jayme Ricardo (Front-end).

Este notebook documenta a arquitetura técnica e a prova de conceito (PoC) da Esmeralda. A aplicação utiliza o modelo **MedGemma 1.5 4B Multimodal** (HAI-DEF) acoplado a uma rigorosa Engenharia de Prompt para atuar como uma preceptora sênior. Em vez de fornecer diagnósticos prontos, o sistema utiliza o Método Socrático para forçar o raciocínio clínico de médicos em formação.

## Run Locally

**Prerequisites:**  
Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Set the `VITE_HF_Token` in [.env.local](.env.local) to your Gemini API key
4. Run the app:
   `npm run dev`
